/**
 * QR Code specification lookup tables for versions 1-15.
 *
 * All data is derived from ISO/IEC 18004 (QR Code specification).
 * This module provides the core reference tables needed for QR code
 * generation: error correction parameters, alignment patterns,
 * format/version info bit strings, and encoding metadata.
 *
 * @module tables
 */

/**
 * Total codewords (data + error correction) per QR version.
 *
 * @type {Object<number, number>}
 */
export const TOTAL_CODEWORDS = {
  1: 26,
  2: 44,
  3: 70,
  4: 100,
  5: 134,
  6: 172,
  7: 196,
  8: 242,
  9: 292,
  10: 346,
  11: 404,
  12: 466,
  13: 532,
  14: 581,
  15: 655,
};

/**
 * Error correction codewords table.
 *
 * EC_CODEWORDS_TABLE[version][ecLevel] returns an object with:
 * - ecPerBlock: number of EC codewords per block
 * - blocks: array of { count, dataCodewords } describing each block group
 *
 * @type {Object<number, Object<string, { ecPerBlock: number, blocks: Array<{ count: number, dataCodewords: number }> }>>}
 */
export const EC_CODEWORDS_TABLE = {
  1: {
    L: { ecPerBlock: 7, blocks: [{ count: 1, dataCodewords: 19 }] },
    M: { ecPerBlock: 10, blocks: [{ count: 1, dataCodewords: 16 }] },
    Q: { ecPerBlock: 13, blocks: [{ count: 1, dataCodewords: 13 }] },
    H: { ecPerBlock: 17, blocks: [{ count: 1, dataCodewords: 9 }] },
  },
  2: {
    L: { ecPerBlock: 10, blocks: [{ count: 1, dataCodewords: 34 }] },
    M: { ecPerBlock: 16, blocks: [{ count: 1, dataCodewords: 28 }] },
    Q: { ecPerBlock: 22, blocks: [{ count: 1, dataCodewords: 22 }] },
    H: { ecPerBlock: 28, blocks: [{ count: 1, dataCodewords: 16 }] },
  },
  3: {
    L: { ecPerBlock: 15, blocks: [{ count: 1, dataCodewords: 55 }] },
    M: { ecPerBlock: 26, blocks: [{ count: 1, dataCodewords: 44 }] },
    Q: { ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 17 }] },
    H: { ecPerBlock: 22, blocks: [{ count: 2, dataCodewords: 13 }] },
  },
  4: {
    L: { ecPerBlock: 20, blocks: [{ count: 1, dataCodewords: 80 }] },
    M: { ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 32 }] },
    Q: { ecPerBlock: 26, blocks: [{ count: 2, dataCodewords: 24 }] },
    H: { ecPerBlock: 16, blocks: [{ count: 4, dataCodewords: 9 }] },
  },
  5: {
    L: { ecPerBlock: 26, blocks: [{ count: 1, dataCodewords: 108 }] },
    M: { ecPerBlock: 24, blocks: [{ count: 2, dataCodewords: 43 }] },
    Q: { ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 15 }, { count: 2, dataCodewords: 16 }] },
    H: { ecPerBlock: 22, blocks: [{ count: 2, dataCodewords: 11 }, { count: 2, dataCodewords: 12 }] },
  },
  6: {
    L: { ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 68 }] },
    M: { ecPerBlock: 16, blocks: [{ count: 4, dataCodewords: 27 }] },
    Q: { ecPerBlock: 24, blocks: [{ count: 4, dataCodewords: 19 }] },
    H: { ecPerBlock: 28, blocks: [{ count: 4, dataCodewords: 15 }] },
  },
  7: {
    L: { ecPerBlock: 20, blocks: [{ count: 2, dataCodewords: 78 }] },
    M: { ecPerBlock: 18, blocks: [{ count: 4, dataCodewords: 31 }] },
    Q: { ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 14 }, { count: 4, dataCodewords: 15 }] },
    H: { ecPerBlock: 26, blocks: [{ count: 4, dataCodewords: 13 }, { count: 1, dataCodewords: 14 }] },
  },
  8: {
    L: { ecPerBlock: 24, blocks: [{ count: 2, dataCodewords: 97 }] },
    M: { ecPerBlock: 22, blocks: [{ count: 2, dataCodewords: 38 }, { count: 2, dataCodewords: 39 }] },
    Q: { ecPerBlock: 22, blocks: [{ count: 4, dataCodewords: 18 }, { count: 2, dataCodewords: 19 }] },
    H: { ecPerBlock: 26, blocks: [{ count: 4, dataCodewords: 14 }, { count: 2, dataCodewords: 15 }] },
  },
  9: {
    L: { ecPerBlock: 30, blocks: [{ count: 2, dataCodewords: 116 }] },
    M: { ecPerBlock: 22, blocks: [{ count: 3, dataCodewords: 36 }, { count: 2, dataCodewords: 37 }] },
    Q: { ecPerBlock: 20, blocks: [{ count: 4, dataCodewords: 16 }, { count: 4, dataCodewords: 17 }] },
    H: { ecPerBlock: 24, blocks: [{ count: 4, dataCodewords: 12 }, { count: 4, dataCodewords: 13 }] },
  },
  10: {
    L: { ecPerBlock: 18, blocks: [{ count: 2, dataCodewords: 68 }, { count: 2, dataCodewords: 69 }] },
    M: { ecPerBlock: 26, blocks: [{ count: 4, dataCodewords: 43 }, { count: 1, dataCodewords: 44 }] },
    Q: { ecPerBlock: 24, blocks: [{ count: 6, dataCodewords: 19 }, { count: 2, dataCodewords: 20 }] },
    H: { ecPerBlock: 28, blocks: [{ count: 6, dataCodewords: 15 }, { count: 2, dataCodewords: 16 }] },
  },
  11: {
    L: { ecPerBlock: 20, blocks: [{ count: 4, dataCodewords: 81 }] },
    M: { ecPerBlock: 30, blocks: [{ count: 1, dataCodewords: 50 }, { count: 4, dataCodewords: 51 }] },
    Q: { ecPerBlock: 28, blocks: [{ count: 4, dataCodewords: 22 }, { count: 4, dataCodewords: 23 }] },
    H: { ecPerBlock: 24, blocks: [{ count: 3, dataCodewords: 12 }, { count: 8, dataCodewords: 13 }] },
  },
  12: {
    L: { ecPerBlock: 24, blocks: [{ count: 2, dataCodewords: 92 }, { count: 2, dataCodewords: 93 }] },
    M: { ecPerBlock: 22, blocks: [{ count: 6, dataCodewords: 36 }, { count: 2, dataCodewords: 37 }] },
    Q: { ecPerBlock: 26, blocks: [{ count: 4, dataCodewords: 20 }, { count: 6, dataCodewords: 21 }] },
    H: { ecPerBlock: 28, blocks: [{ count: 7, dataCodewords: 14 }, { count: 4, dataCodewords: 15 }] },
  },
  13: {
    L: { ecPerBlock: 26, blocks: [{ count: 4, dataCodewords: 107 }] },
    M: { ecPerBlock: 22, blocks: [{ count: 8, dataCodewords: 37 }, { count: 1, dataCodewords: 38 }] },
    Q: { ecPerBlock: 24, blocks: [{ count: 8, dataCodewords: 20 }, { count: 4, dataCodewords: 21 }] },
    H: { ecPerBlock: 22, blocks: [{ count: 12, dataCodewords: 11 }, { count: 4, dataCodewords: 12 }] },
  },
  14: {
    L: { ecPerBlock: 30, blocks: [{ count: 3, dataCodewords: 115 }, { count: 1, dataCodewords: 116 }] },
    M: { ecPerBlock: 24, blocks: [{ count: 4, dataCodewords: 40 }, { count: 5, dataCodewords: 41 }] },
    Q: { ecPerBlock: 20, blocks: [{ count: 11, dataCodewords: 16 }, { count: 5, dataCodewords: 17 }] },
    H: { ecPerBlock: 24, blocks: [{ count: 11, dataCodewords: 12 }, { count: 5, dataCodewords: 13 }] },
  },
  15: {
    L: { ecPerBlock: 22, blocks: [{ count: 5, dataCodewords: 87 }, { count: 1, dataCodewords: 88 }] },
    M: { ecPerBlock: 24, blocks: [{ count: 5, dataCodewords: 41 }, { count: 5, dataCodewords: 42 }] },
    Q: { ecPerBlock: 30, blocks: [{ count: 5, dataCodewords: 24 }, { count: 7, dataCodewords: 25 }] },
    H: { ecPerBlock: 24, blocks: [{ count: 11, dataCodewords: 12 }, { count: 7, dataCodewords: 13 }] },
  },
};

/**
 * Data codewords table.
 *
 * DATA_CODEWORDS_TABLE[version][ecLevel] returns the total number of data
 * codewords available for that version and error correction level.
 * Computed as sum of (block.count * block.dataCodewords) for all block groups.
 *
 * @type {Object<number, Object<string, number>>}
 */
export const DATA_CODEWORDS_TABLE = {
  1: { L: 19, M: 16, Q: 13, H: 9 },
  2: { L: 34, M: 28, Q: 22, H: 16 },
  3: { L: 55, M: 44, Q: 34, H: 26 },
  4: { L: 80, M: 64, Q: 48, H: 36 },
  5: { L: 108, M: 86, Q: 62, H: 46 },
  6: { L: 136, M: 108, Q: 76, H: 60 },
  7: { L: 156, M: 124, Q: 88, H: 66 },
  8: { L: 194, M: 154, Q: 110, H: 86 },
  9: { L: 232, M: 182, Q: 132, H: 100 },
  10: { L: 274, M: 216, Q: 154, H: 122 },
  11: { L: 324, M: 254, Q: 180, H: 140 },
  12: { L: 370, M: 290, Q: 206, H: 158 },
  13: { L: 428, M: 334, Q: 244, H: 180 },
  14: { L: 461, M: 365, Q: 261, H: 197 },
  15: { L: 523, M: 415, Q: 295, H: 223 },
};

/**
 * Alignment pattern center positions per version.
 *
 * Version 1 has no alignment patterns. Versions 2-6 have one alignment
 * pattern (2 coordinates), versions 7+ have two or more (3+ coordinates).
 *
 * @type {Object<number, number[]>}
 */
export const ALIGNMENT_POSITIONS = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
  11: [6, 30, 54],
  12: [6, 32, 58],
  13: [6, 34, 62],
  14: [6, 26, 46, 66],
  15: [6, 26, 48, 70],
};

/**
 * Format information bit strings (15-bit).
 *
 * 32 entries indexed by (ecLevelIndex * 8 + maskPattern).
 * EC level order: L=0, M=1, Q=2, H=3.
 *
 * @type {string[]}
 */
export const FORMAT_INFO_STRINGS = [
  // L (index 0-7)
  '111011111000100',
  '111001011110011',
  '111110110101010',
  '111100010011101',
  '110011000101111',
  '110001100011000',
  '110110001000001',
  '110100101110110',
  // M (index 8-15)
  '101010000010010',
  '101000100100101',
  '101111001111100',
  '101101101001011',
  '100010111111001',
  '100000011001110',
  '100111110010111',
  '100101010100000',
  // Q (index 16-23)
  '011010101011111',
  '011000001101000',
  '011111100110001',
  '011101000000110',
  '010010010110100',
  '010000110000011',
  '010111011011010',
  '010101111101101',
  // H (index 24-31)
  '001011010001001',
  '001001110111110',
  '001110011100111',
  '001100111010000',
  '000011101100010',
  '000001001010101',
  '000110100001100',
  '000100000111011',
];

/**
 * Version information bit strings (18-bit) for versions 7+.
 *
 * Versions below 7 do not have version information.
 *
 * @type {Object<number, string>}
 */
export const VERSION_INFO_STRINGS = {
  7: '000111110010010100',
  8: '001000010110111100',
  9: '001001101010011001',
  10: '001010010011010011',
  11: '001011101111110110',
  12: '001100011101100010',
  13: '001101100001000111',
  14: '001110011000001101',
  15: '001111100100101000',
};

/**
 * Alphanumeric character set mapping.
 *
 * Maps each of the 45 alphanumeric characters to its QR code value.
 * Characters: 0-9, A-Z, SP, $, %, *, +, -, ., /, :
 *
 * @type {Object<string, number>}
 */
export const ALPHANUMERIC_CHARSET = {};

// 0-9 -> values 0-9
for (let i = 0; i <= 9; i++) {
  ALPHANUMERIC_CHARSET[String(i)] = i;
}
// A-Z -> values 10-35
for (let i = 0; i < 26; i++) {
  ALPHANUMERIC_CHARSET[String.fromCharCode(65 + i)] = 10 + i;
}
// Special characters -> values 36-44
const specials = [' ', '$', '%', '*', '+', '-', '.', '/', ':'];
for (let i = 0; i < specials.length; i++) {
  ALPHANUMERIC_CHARSET[specials[i]] = 36 + i;
}

/**
 * Character count indicator bit lengths per version and encoding mode.
 *
 * CHAR_COUNT_BITS[version] returns { numeric, alphanumeric, byte }.
 * Versions 1-9 share the same bit lengths; versions 10-15 use larger values
 * (as they fall in the 10-26 version range per the QR spec).
 *
 * @type {Object<number, { numeric: number, alphanumeric: number, byte: number }>}
 */
export const CHAR_COUNT_BITS = {};

// Versions 1-9: same bit lengths
for (let v = 1; v <= 9; v++) {
  CHAR_COUNT_BITS[v] = { numeric: 10, alphanumeric: 9, byte: 8 };
}
// Versions 10-15: fall in the 10-26 range
for (let v = 10; v <= 15; v++) {
  CHAR_COUNT_BITS[v] = { numeric: 12, alphanumeric: 11, byte: 16 };
}
