/**
 * QR matrix generation core module.
 *
 * Assembles a complete QR code matrix by combining data encoding,
 * error correction, pattern placement, masking, and format information.
 *
 * @module qr
 */

import { detectMode, selectVersion, encodeBits } from './encode.mjs';
import { generateECCodewords } from './ec.mjs';
import {
  EC_CODEWORDS_TABLE,
  ALIGNMENT_POSITIONS,
  FORMAT_INFO_STRINGS,
  VERSION_INFO_STRINGS,
} from './tables.mjs';

/**
 * EC level name to numeric index mapping.
 * @type {Object<string, number>}
 */
const EC_LEVEL_INDEX = { L: 0, M: 1, Q: 2, H: 3 };

/**
 * Mask condition formulas indexed 0-7.
 * Each takes (row, col) and returns true if the module should be flipped.
 * @type {Array<(row: number, col: number) => boolean>}
 */
const MASK_FUNCTIONS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

// ---------------------------------------------------------------------------
// Matrix / reserved grid creation helpers
// ---------------------------------------------------------------------------

/**
 * Create a size x size matrix filled with null.
 * @param {number} size - Matrix dimension.
 * @returns {Array<Array<boolean|null>>}
 */
function createMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

/**
 * Create a size x size boolean grid filled with false.
 * @param {number} size - Matrix dimension.
 * @returns {boolean[][]}
 */
function createReserved(size) {
  return Array.from({ length: size }, () => new Array(size).fill(false));
}

/**
 * Deep-clone a matrix (array of arrays of booleans).
 * @param {boolean[][]} matrix
 * @returns {boolean[][]}
 */
function cloneMatrix(matrix) {
  return matrix.map(row => row.slice());
}

// ---------------------------------------------------------------------------
// Finder pattern placement
// ---------------------------------------------------------------------------

/** 7x7 finder pattern: true = dark, false = light. */
const FINDER = [
  [true,  true,  true,  true,  true,  true,  true],
  [true,  false, false, false, false, false, true],
  [true,  false, true,  true,  true,  false, true],
  [true,  false, true,  true,  true,  false, true],
  [true,  false, true,  true,  true,  false, true],
  [true,  false, false, false, false, false, true],
  [true,  true,  true,  true,  true,  true,  true],
];

/**
 * Place the three finder patterns and their separators.
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {number} size
 */
function placeFinderPatterns(matrix, reserved, size) {
  const origins = [
    [0, 0],               // top-left
    [0, size - 7],        // top-right
    [size - 7, 0],        // bottom-left
  ];

  for (const [oRow, oCol] of origins) {
    // Place 7x7 pattern
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        matrix[oRow + r][oCol + c] = FINDER[r][c];
        reserved[oRow + r][oCol + c] = true;
      }
    }
  }

  // Separators: 1-module-wide light border around each finder

  // Top-left: right edge (col 7, rows 0-7) and bottom edge (row 7, cols 0-7)
  for (let i = 0; i <= 7; i++) {
    setIfInBounds(matrix, reserved, i, 7, false, size);   // right separator
    setIfInBounds(matrix, reserved, 7, i, false, size);   // bottom separator
  }

  // Top-right: left edge (col size-8, rows 0-7) and bottom edge (row 7, cols size-8..size-1)
  for (let i = 0; i <= 7; i++) {
    setIfInBounds(matrix, reserved, i, size - 8, false, size);  // left separator
    setIfInBounds(matrix, reserved, 7, size - 8 + i, false, size); // bottom separator
  }

  // Bottom-left: right edge (col 7, rows size-8..size-1) and top edge (row size-8, cols 0-7)
  for (let i = 0; i <= 7; i++) {
    setIfInBounds(matrix, reserved, size - 8, i, false, size);    // top separator
    setIfInBounds(matrix, reserved, size - 8 + i, 7, false, size); // right separator
  }
}

/**
 * Set a module if within bounds.
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {number} row
 * @param {number} col
 * @param {boolean} value
 * @param {number} size
 */
function setIfInBounds(matrix, reserved, row, col, value, size) {
  if (row >= 0 && row < size && col >= 0 && col < size) {
    matrix[row][col] = value;
    reserved[row][col] = true;
  }
}

// ---------------------------------------------------------------------------
// Alignment pattern placement
// ---------------------------------------------------------------------------

/**
 * Place alignment patterns, skipping areas that overlap finder patterns.
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {number} version
 * @param {number} size
 */
function placeAlignmentPatterns(matrix, reserved, version, size) {
  const positions = ALIGNMENT_POSITIONS[version];
  if (!positions) return; // version 1 has none

  for (const row of positions) {
    for (const col of positions) {
      // Check if any module in the 5x5 area overlaps a finder or separator
      if (overlapsFinderArea(row, col, size)) continue;
      placeOneAlignment(matrix, reserved, row, col);
    }
  }
}

/**
 * Check whether a 5x5 alignment pattern centred at (centerR, centerC)
 * overlaps any finder pattern or separator.
 * @param {number} centerR
 * @param {number} centerC
 * @param {number} size
 * @returns {boolean}
 */
function overlapsFinderArea(centerR, centerC, size) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = centerR + dr;
      const c = centerC + dc;
      // Top-left finder + separator: rows 0-8, cols 0-8
      if (r <= 8 && c <= 8) return true;
      // Top-right finder + separator: rows 0-8, cols size-9..size-1
      if (r <= 8 && c >= size - 8) return true;
      // Bottom-left finder + separator: rows size-9..size-1, cols 0-8
      if (r >= size - 8 && c <= 8) return true;
    }
  }
  return false;
}

/**
 * Place a single 5x5 alignment pattern centred at (centerR, centerC).
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {number} centerR
 * @param {number} centerC
 */
function placeOneAlignment(matrix, reserved, centerR, centerC) {
  const pattern = [
    [true,  true,  true,  true,  true],
    [true,  false, false, false, true],
    [true,  false, true,  false, true],
    [true,  false, false, false, true],
    [true,  true,  true,  true,  true],
  ];
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      matrix[centerR + dr][centerC + dc] = pattern[dr + 2][dc + 2];
      reserved[centerR + dr][centerC + dc] = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Timing patterns
// ---------------------------------------------------------------------------

/**
 * Place horizontal (row 6) and vertical (col 6) timing patterns.
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {number} size
 */
function placeTimingPatterns(matrix, reserved, size) {
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    // Horizontal (row 6)
    if (!reserved[6][i]) {
      matrix[6][i] = dark;
      reserved[6][i] = true;
    }
    // Vertical (col 6)
    if (!reserved[i][6]) {
      matrix[i][6] = dark;
      reserved[i][6] = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Dark module
// ---------------------------------------------------------------------------

/**
 * Place the always-dark module at (4 * version + 9, 8).
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {number} version
 */
function placeDarkModule(matrix, reserved, version) {
  const row = 4 * version + 9;
  matrix[row][8] = true;
  reserved[row][8] = true;
}

// ---------------------------------------------------------------------------
// Reserve format and version info areas
// ---------------------------------------------------------------------------

/**
 * Reserve the modules used by format information (two copies of 15 bits).
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {number} size
 */
function reserveFormatInfo(matrix, reserved, size) {
  // Copy 1: around top-left finder
  // Bits 0-5: (8,0)-(8,5)
  for (let c = 0; c <= 5; c++) {
    reserved[8][c] = true;
  }
  // Bit 6: (8,7)
  reserved[8][7] = true;
  // Bit 7: (8,8)
  reserved[8][8] = true;
  // Bit 8: (7,8)
  reserved[7][8] = true;
  // Bits 9-14: (5,8),(4,8),(3,8),(2,8),(1,8),(0,8)
  for (let r = 5; r >= 0; r--) {
    reserved[r][8] = true;
  }

  // Copy 2:
  // Bits 0-6: (size-1,8)...(size-7,8)
  for (let i = 0; i <= 6; i++) {
    reserved[size - 1 - i][8] = true;
  }
  // Bits 7-14: (8,size-8)...(8,size-1)
  for (let i = 0; i <= 7; i++) {
    reserved[8][size - 8 + i] = true;
  }
}

/**
 * Reserve the modules used by version information (v7-10 only).
 * @param {boolean[][]} reserved
 * @param {number} size
 * @param {number} version
 */
function reserveVersionInfo(reserved, size, version) {
  if (version < 7) return;

  for (let i = 0; i < 18; i++) {
    const r1 = Math.floor(i / 3);
    const c1 = size - 11 + (i % 3);
    reserved[r1][c1] = true;

    const r2 = size - 11 + (i % 3);
    const c2 = Math.floor(i / 3);
    reserved[r2][c2] = true;
  }
}

// ---------------------------------------------------------------------------
// Data interleaving
// ---------------------------------------------------------------------------

/**
 * Split data codewords into blocks, generate EC for each, and interleave.
 * @param {Uint8Array} dataCodewords - All data codewords.
 * @param {number} version
 * @param {string} ecLevel
 * @returns {Uint8Array} Final interleaved data + EC stream.
 */
function interleaveBlocks(dataCodewords, version, ecLevel) {
  const ecInfo = EC_CODEWORDS_TABLE[version][ecLevel];
  const { ecPerBlock, blocks: blockGroups } = ecInfo;

  // Build individual blocks
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (const group of blockGroups) {
    for (let b = 0; b < group.count; b++) {
      const blockData = dataCodewords.slice(offset, offset + group.dataCodewords);
      offset += group.dataCodewords;
      dataBlocks.push(blockData);
      ecBlocks.push(generateECCodewords(blockData, ecPerBlock));
    }
  }

  // Interleave data codewords: round-robin, skip shorter blocks
  const interleavedData = [];
  const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        interleavedData.push(block[i]);
      }
    }
  }

  // Interleave EC codewords: round-robin
  const interleavedEC = [];
  const maxECLen = Math.max(...ecBlocks.map(b => b.length));
  for (let i = 0; i < maxECLen; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) {
        interleavedEC.push(block[i]);
      }
    }
  }

  const result = new Uint8Array(interleavedData.length + interleavedEC.length);
  result.set(interleavedData, 0);
  result.set(interleavedEC, interleavedData.length);
  return result;
}

// ---------------------------------------------------------------------------
// Zigzag data placement
// ---------------------------------------------------------------------------

/**
 * Place data bits into the matrix in zigzag order.
 * @param {Array<Array<boolean|null>>} matrix
 * @param {boolean[][]} reserved
 * @param {Uint8Array} data - Interleaved data+EC stream.
 * @param {number} size
 */
function placeDataBits(matrix, reserved, data, size) {
  // Convert bytes to bit array
  const bits = [];
  for (let i = 0; i < data.length; i++) {
    for (let bit = 7; bit >= 0; bit--) {
      bits.push((data[i] >> bit) & 1);
    }
  }

  let bitIndex = 0;

  // Start from right side, move left in 2-column strips
  // Skip column 6 entirely (timing pattern column)
  let col = size - 1;

  while (col >= 0) {
    // Skip column 6
    if (col === 6) {
      col--;
      continue;
    }

    // The two columns in this strip: col and col-1
    const leftCol = col - 1;

    // Determine direction: upward or downward
    // Strip number from right: (size - 1 - col) adjusted for col 6 skip
    // First strip goes upward, second downward, alternating
    const stripIndex = col > 6
      ? (size - 1 - col) / 2
      : (size - 2 - col) / 2;
    const goingUp = Math.floor(stripIndex) % 2 === 0;

    if (goingUp) {
      for (let row = size - 1; row >= 0; row--) {
        // Right column first, then left
        for (const c of [col, leftCol]) {
          if (c < 0) continue;
          if (!reserved[row][c]) {
            matrix[row][c] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
            bitIndex++;
          }
        }
      }
    } else {
      for (let row = 0; row < size; row++) {
        for (const c of [col, leftCol]) {
          if (c < 0) continue;
          if (!reserved[row][c]) {
            matrix[row][c] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
            bitIndex++;
          }
        }
      }
    }

    col -= 2;
  }
}

// ---------------------------------------------------------------------------
// Format information writing
// ---------------------------------------------------------------------------

/**
 * Write format information bits into the matrix.
 * @param {boolean[][]} matrix
 * @param {number} size
 * @param {string} ecLevel
 * @param {number} maskIndex
 */
function writeFormatInfo(matrix, size, ecLevel, maskIndex) {
  const index = EC_LEVEL_INDEX[ecLevel] * 8 + maskIndex;
  const bits = FORMAT_INFO_STRINGS[index];

  // Copy 1: around top-left finder
  // Bits 0-5: (8,0),(8,1),(8,2),(8,3),(8,4),(8,5)
  const copy1Positions = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7],    // bit 6
    [8, 8],    // bit 7
    [7, 8],    // bit 8
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // bits 9-14
  ];

  for (let i = 0; i < 15; i++) {
    const [r, c] = copy1Positions[i];
    matrix[r][c] = bits[i] === '1';
  }

  // Copy 2:
  // Bits 0-6: (size-1,8),(size-2,8),...,(size-7,8)
  // Bits 7-14: (8,size-8),(8,size-7),...,(8,size-1)
  const copy2Positions = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
    [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];

  for (let i = 0; i < 15; i++) {
    const [r, c] = copy2Positions[i];
    matrix[r][c] = bits[i] === '1';
  }
}

// ---------------------------------------------------------------------------
// Version information writing
// ---------------------------------------------------------------------------

/**
 * Write version information bits (v7-10 only).
 * @param {boolean[][]} matrix
 * @param {number} size
 * @param {number} version
 */
function writeVersionInfo(matrix, size, version) {
  if (version < 7) return;

  const bits = VERSION_INFO_STRINGS[version];

  for (let i = 0; i < 18; i++) {
    const dark = bits[i] === '1';

    // Copy 1: bottom-left of top-right finder area
    const r1 = Math.floor(i / 3);
    const c1 = size - 11 + (i % 3);
    matrix[r1][c1] = dark;

    // Copy 2: top-right of bottom-left finder area
    const r2 = size - 11 + (i % 3);
    const c2 = Math.floor(i / 3);
    matrix[r2][c2] = dark;
  }
}

// ---------------------------------------------------------------------------
// Penalty score calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the total penalty score for a matrix.
 * @param {boolean[][]} matrix
 * @param {number} size
 * @returns {number}
 */
function calculatePenalty(matrix, size) {
  return penaltyRule1(matrix, size)
       + penaltyRule2(matrix, size)
       + penaltyRule3(matrix, size)
       + penaltyRule4(matrix, size);
}

/**
 * Rule 1: 5+ consecutive same-color modules in a row or column.
 * Penalty: 3 + (count - 5) for each run.
 * @param {boolean[][]} matrix
 * @param {number} size
 * @returns {number}
 */
function penaltyRule1(matrix, size) {
  let penalty = 0;

  // Check rows
  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        count++;
      } else {
        if (count >= 5) penalty += 3 + (count - 5);
        count = 1;
      }
    }
    if (count >= 5) penalty += 3 + (count - 5);
  }

  // Check columns
  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        count++;
      } else {
        if (count >= 5) penalty += 3 + (count - 5);
        count = 1;
      }
    }
    if (count >= 5) penalty += 3 + (count - 5);
  }

  return penalty;
}

/**
 * Rule 2: 2x2 same-color blocks. 3 points each.
 * @param {boolean[][]} matrix
 * @param {number} size
 * @returns {number}
 */
function penaltyRule2(matrix, size) {
  let penalty = 0;
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const val = matrix[r][c];
      if (val === matrix[r][c + 1]
        && val === matrix[r + 1][c]
        && val === matrix[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }
  return penalty;
}

/**
 * Rule 3: Finder-like patterns (10111010000 or 00001011101) in rows/cols.
 * 40 points each.
 * @param {boolean[][]} matrix
 * @param {number} size
 * @returns {number}
 */
function penaltyRule3(matrix, size) {
  let penalty = 0;
  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      if (matchesPattern(matrix, r, c, pattern1, true) || matchesPattern(matrix, r, c, pattern2, true)) {
        penalty += 40;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      if (matchesPattern(matrix, r, c, pattern1, false) || matchesPattern(matrix, r, c, pattern2, false)) {
        penalty += 40;
      }
    }
  }

  return penalty;
}

/**
 * Check if an 11-module pattern matches at position.
 * @param {boolean[][]} matrix
 * @param {number} row
 * @param {number} col
 * @param {boolean[]} pattern
 * @param {boolean} horizontal - true for row scan, false for column scan
 * @returns {boolean}
 */
function matchesPattern(matrix, row, col, pattern, horizontal) {
  for (let i = 0; i < pattern.length; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (matrix[r][c] !== pattern[i]) return false;
  }
  return true;
}

/**
 * Rule 4: Dark percentage deviation from 50%.
 * 10 * floor(abs(percentage - 50) / 5).
 * @param {boolean[][]} matrix
 * @param {number} size
 * @returns {number}
 */
function penaltyRule4(matrix, size) {
  let darkCount = 0;
  const total = size * size;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) darkCount++;
    }
  }
  const percentage = (darkCount / total) * 100;
  return 10 * Math.floor(Math.abs(percentage - 50) / 5);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a complete QR code matrix from text.
 *
 * @param {string} text - The text to encode.
 * @param {Object} [options] - Generation options.
 * @param {'L'|'M'|'Q'|'H'} [options.ecLevel='L'] - Error correction level.
 * @returns {boolean[][]} 2D boolean array where true = dark module, false = light module.
 */
export function generateMatrix(text, options) {
  const ecLevel = (options && options.ecLevel) || 'L';

  // 1. Detect mode, select version, encode data
  const version = selectVersion(text, ecLevel);
  const dataCodewords = encodeBits(text, version, ecLevel);

  // 2. Interleave data blocks and EC
  const finalStream = interleaveBlocks(dataCodewords, version, ecLevel);

  // 3. Create matrix and reserved grid
  const size = 4 * version + 17;
  const matrix = createMatrix(size);
  const reserved = createReserved(size);

  // 4. Place function patterns
  placeFinderPatterns(matrix, reserved, size);
  placeAlignmentPatterns(matrix, reserved, version, size);
  placeTimingPatterns(matrix, reserved, size);
  placeDarkModule(matrix, reserved, version);

  // 5. Reserve format and version info areas
  reserveFormatInfo(matrix, reserved, size);
  reserveVersionInfo(reserved, size, version);

  // 6. Place data bits in zigzag pattern
  placeDataBits(matrix, reserved, finalStream, size);

  // 7. Try all 8 masks and select best
  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestMatrix = null;

  for (let maskIndex = 0; maskIndex < 8; maskIndex++) {
    const candidate = cloneMatrix(matrix);

    // Apply mask to data modules only
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!reserved[r][c] && MASK_FUNCTIONS[maskIndex](r, c)) {
          candidate[r][c] = !candidate[r][c];
        }
      }
    }

    // Write format info
    writeFormatInfo(candidate, size, ecLevel, maskIndex);

    // Write version info (v7-10)
    writeVersionInfo(candidate, size, version);

    // Calculate penalty
    const penalty = calculatePenalty(candidate, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = maskIndex;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}
