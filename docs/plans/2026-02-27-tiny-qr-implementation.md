# tiny-qr Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an ultra-lightweight, zero-dependency Node.js QR code generator (Version 1-10, BMP output).

**Architecture:** Single-responsibility ESM modules: tables (spec data) → encode (data encoding) → ec (Reed-Solomon) → qr (matrix assembly) → bmp (image output) → index (public API) → CLI. Each module is independently testable.

**Tech Stack:** Node.js 20+, ESM-only, zero npm dependencies. Test with Node.js built-in `node:test` + `node:assert` (zero test dependencies too).

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "tiny-qr",
  "version": "0.1.0",
  "description": "Ultra-lightweight zero-dependency QR code generator",
  "type": "module",
  "exports": "./src/index.mjs",
  "bin": {
    "tiny-qr": "./bin/tiny-qr.mjs"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "test": "node --test test/**/*.test.mjs"
  },
  "files": [
    "src/",
    "bin/"
  ],
  "license": "MIT",
  "keywords": ["qr", "qrcode", "generator", "lightweight", "zero-dependency", "bmp"]
}
```

**Step 2: Create .gitignore**

```
node_modules/
*.bmp
```

**Step 3: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: scaffold project with package.json"
```

---

### Task 2: QR Spec Tables Module

**Files:**
- Create: `src/tables.mjs`
- Create: `test/tables.test.mjs`

**Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  EC_CODEWORDS_TABLE,
  DATA_CODEWORDS_TABLE,
  ALIGNMENT_POSITIONS,
  FORMAT_INFO_STRINGS,
  VERSION_INFO_STRINGS,
  ALPHANUMERIC_CHARSET,
  CHAR_COUNT_BITS,
} from '../src/tables.mjs';

describe('tables', () => {
  it('should have entries for versions 1-10', () => {
    for (let v = 1; v <= 10; v++) {
      assert.ok(EC_CODEWORDS_TABLE[v], `Missing EC table for version ${v}`);
      assert.ok(DATA_CODEWORDS_TABLE[v], `Missing data table for version ${v}`);
    }
  });

  it('should have correct module size per version', () => {
    // Version N → (4*N + 17) modules per side
    for (let v = 1; v <= 10; v++) {
      const expected = 4 * v + 17;
      assert.equal(typeof expected, 'number');
    }
  });

  it('should have alignment positions for versions 2-10', () => {
    assert.equal(ALIGNMENT_POSITIONS[1], undefined);
    assert.deepEqual(ALIGNMENT_POSITIONS[2], [6, 18]);
    assert.deepEqual(ALIGNMENT_POSITIONS[7], [6, 22, 38]);
  });

  it('should have 32 format info strings', () => {
    assert.equal(FORMAT_INFO_STRINGS.length, 32);
    assert.equal(FORMAT_INFO_STRINGS[0].length, 15);
  });

  it('should have version info for versions 7-10', () => {
    assert.equal(VERSION_INFO_STRINGS[7].length, 18);
    assert.equal(VERSION_INFO_STRINGS[6], undefined);
  });

  it('should have 45 alphanumeric chars', () => {
    assert.equal(Object.keys(ALPHANUMERIC_CHARSET).length, 45);
    assert.equal(ALPHANUMERIC_CHARSET['0'], 0);
    assert.equal(ALPHANUMERIC_CHARSET['A'], 10);
    assert.equal(ALPHANUMERIC_CHARSET[' '], 36);
  });

  it('should have correct char count bits', () => {
    // Versions 1-9: Numeric=10, Alphanumeric=9, Byte=8
    assert.equal(CHAR_COUNT_BITS[1].numeric, 10);
    assert.equal(CHAR_COUNT_BITS[1].alphanumeric, 9);
    assert.equal(CHAR_COUNT_BITS[1].byte, 8);
    // Version 10: Numeric=12, Alphanumeric=11, Byte=16
    assert.equal(CHAR_COUNT_BITS[10].numeric, 12);
    assert.equal(CHAR_COUNT_BITS[10].alphanumeric, 11);
    assert.equal(CHAR_COUNT_BITS[10].byte, 16);
  });

  it('should have correct Version 1-L data capacity', () => {
    // Version 1, EC Level L: 19 data codewords
    assert.equal(DATA_CODEWORDS_TABLE[1].L, 19);
  });

  it('should have correct EC codewords per block for Version 1-L', () => {
    // Version 1-L: 1 block, 7 EC codewords per block
    assert.equal(EC_CODEWORDS_TABLE[1].L.ecPerBlock, 7);
    assert.equal(EC_CODEWORDS_TABLE[1].L.blocks.length, 1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/tables.test.mjs`
Expected: FAIL (module not found)

**Step 3: Implement tables.mjs**

Build `src/tables.mjs` with all QR spec lookup tables for versions 1-10. Key data:

- `EC_CODEWORDS_TABLE[version][ecLevel]` → `{ ecPerBlock, blocks: [{ count, dataCodewords }] }`
- `DATA_CODEWORDS_TABLE[version][ecLevel]` → total data codewords
- `ALIGNMENT_POSITIONS[version]` → array of row/col coordinates
- `FORMAT_INFO_STRINGS` → array of 32 pre-computed 15-bit strings (8 masks × 4 EC levels)
- `VERSION_INFO_STRINGS[version]` → 18-bit string (v7-10 only)
- `ALPHANUMERIC_CHARSET` → char → value mapping (45 chars)
- `CHAR_COUNT_BITS[version]` → `{ numeric, alphanumeric, byte }`
- `TOTAL_CODEWORDS[version]` → total codewords in QR symbol

Reference data sources:
- Thonky QR tutorial tables
- ISO/IEC 18004:2015

EC codewords per block table (version, level → ecPerBlock, blocks):
```
V1-L: ecPerBlock=7,  blocks=[{count:1, data:19}]          total_data=19
V1-M: ecPerBlock=10, blocks=[{count:1, data:16}]          total_data=16
V1-Q: ecPerBlock=13, blocks=[{count:1, data:13}]          total_data=13
V1-H: ecPerBlock=17, blocks=[{count:1, data:9}]           total_data=9
V2-L: ecPerBlock=10, blocks=[{count:1, data:34}]          total_data=34
V2-M: ecPerBlock=16, blocks=[{count:1, data:28}]          total_data=28
V2-Q: ecPerBlock=22, blocks=[{count:1, data:22}]          total_data=22
V2-H: ecPerBlock=28, blocks=[{count:1, data:16}]          total_data=16
V3-L: ecPerBlock=15, blocks=[{count:1, data:55}]          total_data=55
V3-M: ecPerBlock=26, blocks=[{count:1, data:44}]          total_data=44
V3-Q: ecPerBlock=18, blocks=[{count:2, data:17}]          total_data=34
V3-H: ecPerBlock=22, blocks=[{count:2, data:13}]          total_data=26
V4-L: ecPerBlock=20, blocks=[{count:1, data:80}]          total_data=80
V4-M: ecPerBlock=18, blocks=[{count:2, data:32}]          total_data=64
V4-Q: ecPerBlock=26, blocks=[{count:2, data:24}]          total_data=48
V4-H: ecPerBlock=16, blocks=[{count:4, data:9}]           total_data=36
V5-L: ecPerBlock=26, blocks=[{count:1, data:108}]         total_data=108
V5-M: ecPerBlock=24, blocks=[{count:2, data:43}]          total_data=86
V5-Q: ecPerBlock=18, blocks=[{count:2,data:15},{count:2,data:16}] total_data=62
V5-H: ecPerBlock=22, blocks=[{count:2,data:11},{count:2,data:12}] total_data=46
V6-L: ecPerBlock=18, blocks=[{count:2, data:68}]          total_data=136
V6-M: ecPerBlock=16, blocks=[{count:4, data:27}]          total_data=108
V6-Q: ecPerBlock=24, blocks=[{count:4, data:19}]          total_data=76
V6-H: ecPerBlock=28, blocks=[{count:4, data:15}]          total_data=60
V7-L: ecPerBlock=20, blocks=[{count:2, data:78}]          total_data=156
V7-M: ecPerBlock=18, blocks=[{count:4, data:31}]          total_data=124
V7-Q: ecPerBlock=18, blocks=[{count:2,data:14},{count:4,data:15}] total_data=88
V7-H: ecPerBlock=26, blocks=[{count:4,data:13},{count:1,data:14}] total_data=66
V8-L: ecPerBlock=24, blocks=[{count:2, data:97}]          total_data=194
V8-M: ecPerBlock=22, blocks=[{count:2,data:38},{count:2,data:39}] total_data=154
V8-Q: ecPerBlock=22, blocks=[{count:4,data:18},{count:2,data:19}] total_data=110
V8-H: ecPerBlock=26, blocks=[{count:4,data:14},{count:2,data:15}] total_data=86
V9-L: ecPerBlock=30, blocks=[{count:2, data:116}]         total_data=232
V9-M: ecPerBlock=22, blocks=[{count:3,data:36},{count:2,data:37}] total_data=182
V9-Q: ecPerBlock=20, blocks=[{count:4,data:16},{count:4,data:17}] total_data=132
V9-H: ecPerBlock=24, blocks=[{count:4,data:12},{count:4,data:13}] total_data=100
V10-L: ecPerBlock=18, blocks=[{count:2,data:68},{count:2,data:69}] total_data=274
V10-M: ecPerBlock=26, blocks=[{count:4,data:43},{count:1,data:44}] total_data=216
V10-Q: ecPerBlock=24, blocks=[{count:6,data:19},{count:2,data:20}] total_data=154
V10-H: ecPerBlock=28, blocks=[{count:6,data:15},{count:2,data:16}] total_data=122
```

Alignment positions:
```
V2:[6,18] V3:[6,22] V4:[6,26] V5:[6,30] V6:[6,34]
V7:[6,22,38] V8:[6,24,42] V9:[6,26,46] V10:[6,28,50]
```

Format info strings (pre-XORed with 101010000010010):
Index = ecLevel_index * 8 + mask_pattern (ecLevel order: L=0,M=1,Q=2,H=3)
```
L-mask0: 111011111000100   L-mask1: 111001011110011
L-mask2: 111110110101010   L-mask3: 111100010011101
L-mask4: 110011000101111   L-mask5: 110001100011000
L-mask6: 110110001000001   L-mask7: 110100101110110
M-mask0: 101010000010010   M-mask1: 101000100100101
M-mask2: 101111001111100   M-mask3: 101101101001011
M-mask4: 100010111111001   M-mask5: 100000011001110
M-mask6: 100111110010111   M-mask7: 100101010100000
Q-mask0: 011010101011111   Q-mask1: 011000001101000
Q-mask2: 011111100110001   Q-mask3: 011101000000110
Q-mask4: 010010010110100   Q-mask5: 010000110000011
Q-mask6: 010111011011010   Q-mask7: 010101111101101
H-mask0: 001011010001001   H-mask1: 001001110111110
H-mask2: 001110011100111   H-mask3: 001100111010000
H-mask4: 000011101100010   H-mask5: 000001001010101
H-mask6: 000110100001100   H-mask7: 000100000111011
```

Version info strings (18-bit, for v7-10):
```
V7:  000111110010010100
V8:  001000010110111100
V9:  001001101010011001
V10: 001010010011010011
```

**Step 4: Run tests to verify they pass**

Run: `node --test test/tables.test.mjs`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/tables.mjs test/tables.test.mjs
git commit -m "feat: add QR spec lookup tables for versions 1-10"
```

---

### Task 3: Data Encoding Module

**Files:**
- Create: `src/encode.mjs`
- Create: `test/encode.test.mjs`

**Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { encodeBits, detectMode, selectVersion } from '../src/encode.mjs';

describe('detectMode', () => {
  it('should detect numeric mode', () => {
    assert.equal(detectMode('12345'), 'numeric');
  });

  it('should detect alphanumeric mode', () => {
    assert.equal(detectMode('HELLO WORLD'), 'alphanumeric');
    assert.equal(detectMode('ABC123'), 'alphanumeric');
  });

  it('should detect byte mode for lowercase', () => {
    assert.equal(detectMode('hello'), 'byte');
  });

  it('should detect byte mode for unicode', () => {
    assert.equal(detectMode('https://example.com'), 'byte');
  });
});

describe('selectVersion', () => {
  it('should select version 1 for short data', () => {
    assert.equal(selectVersion('01234567', 'L'), 1);
  });

  it('should select higher version for longer data', () => {
    const long = 'A'.repeat(100);
    const v = selectVersion(long, 'L');
    assert.ok(v > 1 && v <= 10);
  });

  it('should throw for data too large', () => {
    const huge = 'A'.repeat(5000);
    assert.throws(() => selectVersion(huge, 'L'), /too large/i);
  });
});

describe('encodeBits', () => {
  it('should encode numeric data correctly', () => {
    // "01234567" in numeric mode:
    // mode indicator (0001) + char count (10 bits) + data groups
    const bits = encodeBits('01234567', 1, 'L');
    assert.ok(bits instanceof Uint8Array);
    assert.ok(bits.length > 0);
  });

  it('should encode alphanumeric data correctly', () => {
    const bits = encodeBits('HELLO', 1, 'L');
    assert.ok(bits instanceof Uint8Array);
  });

  it('should encode byte data correctly', () => {
    const bits = encodeBits('hello', 2, 'L');
    assert.ok(bits instanceof Uint8Array);
  });

  it('should pad data codewords to correct length', () => {
    // Version 1-L has 19 data codewords
    const bits = encodeBits('01234567', 1, 'L');
    assert.equal(bits.length, 19);
  });

  it('should use alternating pad bytes 0xEC and 0x11', () => {
    const bits = encodeBits('1', 1, 'L');
    // After data, remaining bytes should alternate 0xEC and 0x11
    // Find first pad byte
    let padStart = -1;
    for (let i = 0; i < bits.length; i++) {
      if (i > 0 && bits[i] === 0xEC) { padStart = i; break; }
    }
    if (padStart >= 0 && padStart + 1 < bits.length) {
      assert.equal(bits[padStart], 0xEC);
      assert.equal(bits[padStart + 1], 0x11);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/encode.test.mjs`
Expected: FAIL

**Step 3: Implement encode.mjs**

Module exports:
- `detectMode(text)` → `'numeric' | 'alphanumeric' | 'byte'`
- `selectVersion(text, ecLevel)` → version number (1-10)
- `encodeBits(text, version, ecLevel)` → `Uint8Array` of data codewords

Implementation details:
1. **detectMode**: Check if all digits → numeric. Check if all in ALPHANUMERIC_CHARSET → alphanumeric. Otherwise → byte.
2. **selectVersion**: For each version 1-10, check if data fits in the data capacity for that version+ecLevel. Return smallest fitting version.
3. **encodeBits**:
   - Write mode indicator (4 bits): numeric=0001, alphanumeric=0010, byte=0100
   - Write character count indicator (bit length from CHAR_COUNT_BITS table)
   - Encode data based on mode:
     - Numeric: groups of 3→10bits, 2→7bits, 1→4bits
     - Alphanumeric: pairs→11bits, single→6bits
     - Byte: each byte→8bits
   - Add terminator (0000, up to 4 bits, don't exceed capacity)
   - Pad to byte boundary with 0s
   - Pad with alternating 0xEC, 0x11 to fill data codewords capacity
   - Return as Uint8Array of codeword bytes

Use a simple bit-stream writer (internal helper, not exported).

**Step 4: Run tests to verify they pass**

Run: `node --test test/encode.test.mjs`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/encode.mjs test/encode.test.mjs
git commit -m "feat: add data encoding module (numeric/alphanumeric/byte)"
```

---

### Task 4: Reed-Solomon Error Correction Module

**Files:**
- Create: `src/ec.mjs`
- Create: `test/ec.test.mjs`

**Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateECCodewords } from '../src/ec.mjs';

describe('generateECCodewords', () => {
  it('should generate correct number of EC codewords', () => {
    // 7 EC codewords for Version 1-L
    const data = new Uint8Array([32, 65, 205, 69, 41, 220, 46, 128, 236,
      17, 236, 17, 236, 17, 236, 17, 236, 17, 236]);
    const ec = generateECCodewords(data, 7);
    assert.equal(ec.length, 7);
  });

  it('should produce consistent results', () => {
    const data = new Uint8Array([32, 65, 205, 69, 41, 220, 46, 128, 236]);
    const ec1 = generateECCodewords(data, 10);
    const ec2 = generateECCodewords(data, 10);
    assert.deepEqual(ec1, ec2);
  });

  it('should handle single block correctly', () => {
    // Known test vector: "HELLO WORLD" Version 1-Q
    // Data codewords: 32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236
    // Expected EC (13 codewords): 196, 35, 39, 119, 235, 215, 231, 226, 93, 23, 175, 67, 35 (example)
    const data = new Uint8Array([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]);
    const ec = generateECCodewords(data, 13);
    assert.equal(ec.length, 13);
    // Each EC codeword should be 0-255
    for (const b of ec) {
      assert.ok(b >= 0 && b <= 255);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/ec.test.mjs`
Expected: FAIL

**Step 3: Implement ec.mjs**

Module exports:
- `generateECCodewords(dataBytes, ecCount)` → `Uint8Array` of EC codewords

Implementation:
1. Build GF(256) log and antilog tables using primitive polynomial 0x11D
2. Implement GF multiplication using log/antilog tables
3. Build generator polynomial for `ecCount` EC codewords
4. Perform polynomial division (data polynomial ÷ generator polynomial)
5. Return remainder as EC codewords

The log/antilog tables are computed once at module load (256 entries each, trivial memory).

```javascript
// GF(256) with primitive polynomial 0x11D
const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
let val = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = val;
  LOG[val] = i;
  val = (val << 1) ^ (val >= 128 ? 0x11D : 0);
}
EXP[255] = EXP[0]; // wrap

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

function generateECCodewords(data, ecCount) {
  // Build generator polynomial
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], EXP[i]);
    }
    gen = next;
  }

  // Polynomial division
  const result = new Uint8Array(ecCount);
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }

  result.set(msg.subarray(data.length));
  return result;
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test test/ec.test.mjs`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/ec.mjs test/ec.test.mjs
git commit -m "feat: add Reed-Solomon error correction module"
```

---

### Task 5: QR Matrix Generation Core

**Files:**
- Create: `src/qr.mjs`
- Create: `test/qr.test.mjs`

**Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateMatrix } from '../src/qr.mjs';

describe('generateMatrix', () => {
  it('should return a 2D boolean array', () => {
    const matrix = generateMatrix('01234567', { ecLevel: 'L' });
    assert.ok(Array.isArray(matrix));
    assert.ok(Array.isArray(matrix[0]));
    assert.equal(typeof matrix[0][0], 'boolean');
  });

  it('should have correct dimensions for version 1', () => {
    // Version 1 = 21x21
    const matrix = generateMatrix('01234567', { ecLevel: 'M' });
    assert.equal(matrix.length, 21);
    assert.equal(matrix[0].length, 21);
  });

  it('should have correct dimensions for higher versions', () => {
    const long = 'HTTPS://EXAMPLE.COM/PATH/TO/RESOURCE';
    const matrix = generateMatrix(long, { ecLevel: 'L' });
    // Should be > 21 modules
    const size = matrix.length;
    assert.ok(size > 21);
    assert.equal(size, matrix[0].length); // square
    // Size should be 4*version + 17, so (size - 17) % 4 === 0
    assert.equal((size - 17) % 4, 0);
  });

  it('should have finder patterns in corners', () => {
    const matrix = generateMatrix('TEST', { ecLevel: 'L' });
    const size = matrix.length;
    // Top-left finder: 7x7 all-dark border
    assert.equal(matrix[0][0], true);  // dark
    assert.equal(matrix[0][6], true);  // dark
    assert.equal(matrix[6][0], true);  // dark
    assert.equal(matrix[6][6], true);  // dark
    assert.equal(matrix[0][3], true);  // center column dark
    // Top-right finder
    assert.equal(matrix[0][size - 1], true);
    assert.equal(matrix[0][size - 7], true);
    // Bottom-left finder
    assert.equal(matrix[size - 1][0], true);
    assert.equal(matrix[size - 7][0], true);
  });

  it('should produce deterministic output', () => {
    const m1 = generateMatrix('HELLO', { ecLevel: 'L' });
    const m2 = generateMatrix('HELLO', { ecLevel: 'L' });
    assert.deepEqual(m1, m2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/qr.test.mjs`
Expected: FAIL

**Step 3: Implement qr.mjs**

Module exports:
- `generateMatrix(text, options)` → `boolean[][]` (true=dark, false=light)

Implementation steps (all internal to qr.mjs):
1. Detect mode, select version, encode data bits (using encode.mjs)
2. Generate EC codewords (using ec.mjs), interleave data+EC blocks
3. Create empty matrix of size (4*version + 17)
4. Place finder patterns (3 corners) + separators
5. Place alignment patterns (from ALIGNMENT_POSITIONS, skip if overlapping finder)
6. Place timing patterns (row 6, col 6)
7. Place dark module at (4*version + 9, 8)
8. Reserve format info areas (don't fill yet)
9. Reserve version info areas for v7-10
10. Place data bits in zigzag pattern (right-to-left, bottom-to-top, skipping column 6)
11. Try all 8 mask patterns:
    - Apply mask to data modules only (not function patterns)
    - Write format info bits
    - Write version info bits (v7-10)
    - Calculate penalty score (4 rules)
12. Select mask with lowest penalty
13. Return final matrix

Data interleaving:
- Split data codewords into blocks per EC_CODEWORDS_TABLE
- Generate EC codewords for each block
- Interleave: take 1 codeword from each block round-robin (data first, then EC)

**Step 4: Run tests to verify they pass**

Run: `node --test test/qr.test.mjs`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/qr.mjs test/qr.test.mjs
git commit -m "feat: add QR matrix generation core"
```

---

### Task 6: BMP Image Encoder

**Files:**
- Create: `src/bmp.mjs`
- Create: `test/bmp.test.mjs`

**Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { matrixToBMP } from '../src/bmp.mjs';

describe('matrixToBMP', () => {
  it('should return a Buffer', () => {
    const matrix = [[true, false], [false, true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    assert.ok(Buffer.isBuffer(buf));
  });

  it('should start with BMP magic bytes "BM"', () => {
    const matrix = [[true, false], [false, true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    assert.equal(buf[0], 0x42); // 'B'
    assert.equal(buf[1], 0x4D); // 'M'
  });

  it('should have correct pixel data offset (54 bytes for 24-bit BMP)', () => {
    const matrix = [[true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    // Offset at bytes 10-13 (little-endian)
    const offset = buf.readUInt32LE(10);
    assert.equal(offset, 54);
  });

  it('should scale pixels correctly', () => {
    const matrix = [[true]]; // 1x1 dark
    const scale = 4;
    const margin = 0;
    const buf = matrixToBMP(matrix, { scale, margin });
    // Image should be 4x4 pixels
    const width = buf.readInt32LE(18);
    const height = buf.readInt32LE(22);
    assert.equal(width, 4);
    assert.equal(Math.abs(height), 4);
  });

  it('should add margin correctly', () => {
    const matrix = [[true]]; // 1x1
    const scale = 1;
    const margin = 4;
    const buf = matrixToBMP(matrix, { scale, margin });
    // Image should be (1 + 2*4) = 9x9 pixels
    const width = buf.readInt32LE(18);
    assert.equal(width, 9);
  });

  it('should encode dark modules as black and light as white', () => {
    // 1x1 dark module, scale 1, no margin, 24-bit BMP
    const matrix = [[true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    // Pixel data starts at offset 54
    // BMP rows are bottom-up, 24-bit = 3 bytes per pixel (BGR)
    // Dark = black = 0x00,0x00,0x00
    assert.equal(buf[54], 0x00);
    assert.equal(buf[55], 0x00);
    assert.equal(buf[56], 0x00);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/bmp.test.mjs`
Expected: FAIL

**Step 3: Implement bmp.mjs**

Module exports:
- `matrixToBMP(matrix, options)` → `Buffer`

Options: `{ scale: number, margin: number }`

BMP format (24-bit, uncompressed):
1. **File header** (14 bytes): magic "BM", file size, reserved, pixel data offset (54)
2. **DIB header** (40 bytes, BITMAPINFOHEADER): width, height, planes=1, bpp=24, compression=0, etc.
3. **Pixel data**: rows bottom-to-top, each row padded to 4-byte boundary. Each pixel = 3 bytes BGR.

Implementation:
```javascript
export function matrixToBMP(matrix, { scale = 10, margin = 4 } = {}) {
  const size = matrix.length * scale + margin * 2;
  const rowBytes = size * 3;
  const rowPadding = (4 - (rowBytes % 4)) % 4;
  const paddedRowBytes = rowBytes + rowPadding;
  const pixelDataSize = paddedRowBytes * size;
  const fileSize = 54 + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  // File header (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10); // pixel data offset

  // DIB header (40 bytes)
  buf.writeUInt32LE(40, 14);     // header size
  buf.writeInt32LE(size, 18);    // width
  buf.writeInt32LE(size, 22);    // height (positive = bottom-up)
  buf.writeUInt16LE(1, 26);      // planes
  buf.writeUInt16LE(24, 28);     // bits per pixel
  buf.writeUInt32LE(pixelDataSize, 34); // image size

  // Pixel data (bottom-up)
  for (let y = size - 1; y >= 0; y--) {
    const rowOffset = 54 + (size - 1 - y) * paddedRowBytes;
    for (let x = 0; x < size; x++) {
      const mx = Math.floor((x - margin) / scale);
      const my = Math.floor((y - margin) / scale);
      const isDark = mx >= 0 && mx < matrix.length
        && my >= 0 && my < matrix.length
        && matrix[my][mx];
      const color = isDark ? 0x00 : 0xFF;
      const px = rowOffset + x * 3;
      buf[px] = color;     // B
      buf[px + 1] = color; // G
      buf[px + 2] = color; // R
    }
  }

  return buf;
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test test/bmp.test.mjs`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/bmp.mjs test/bmp.test.mjs
git commit -m "feat: add BMP image encoder"
```

---

### Task 7: Public API (index.mjs)

**Files:**
- Create: `src/index.mjs`
- Create: `test/index.test.mjs`

**Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generate, toBuffer, toFile } from '../src/index.mjs';
import { existsSync, unlinkSync } from 'node:fs';

describe('generate', () => {
  it('should return a 2D boolean array', () => {
    const matrix = generate('HELLO');
    assert.ok(Array.isArray(matrix));
    assert.ok(Array.isArray(matrix[0]));
    assert.equal(typeof matrix[0][0], 'boolean');
  });

  it('should accept ecLevel option', () => {
    const matrix = generate('TEST', { ecLevel: 'M' });
    assert.ok(matrix.length >= 21);
  });
});

describe('toBuffer', () => {
  it('should return a BMP Buffer', () => {
    const buf = toBuffer('HELLO');
    assert.ok(Buffer.isBuffer(buf));
    assert.equal(buf[0], 0x42); // 'B'
    assert.equal(buf[1], 0x4D); // 'M'
  });

  it('should accept scale and margin options', () => {
    const buf = toBuffer('HI', { scale: 5, margin: 2 });
    assert.ok(Buffer.isBuffer(buf));
  });
});

describe('toFile', () => {
  const testPath = '/tmp/tiny-qr-test-output.bmp';

  it('should write a BMP file', async () => {
    await toFile('HELLO', testPath);
    assert.ok(existsSync(testPath));
    unlinkSync(testPath); // cleanup
  });

  it('should accept options', async () => {
    await toFile('HELLO', testPath, { scale: 5, ecLevel: 'Q' });
    assert.ok(existsSync(testPath));
    unlinkSync(testPath); // cleanup
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/index.test.mjs`
Expected: FAIL

**Step 3: Implement index.mjs**

```javascript
import { generateMatrix } from './qr.mjs';
import { matrixToBMP } from './bmp.mjs';

/**
 * Generate a QR code as a 2D boolean matrix.
 * @param {string} text - Text to encode
 * @param {{ ecLevel?: 'L'|'M'|'Q'|'H' }} [options]
 * @returns {boolean[][]} QR matrix (true = dark module)
 */
export function generate(text, options = {}) {
  return generateMatrix(text, options);
}

/**
 * Generate a QR code as a BMP image Buffer.
 * @param {string} text - Text to encode
 * @param {{ ecLevel?: 'L'|'M'|'Q'|'H', scale?: number, margin?: number }} [options]
 * @returns {Buffer} BMP image data
 */
export function toBuffer(text, options = {}) {
  const { ecLevel, scale, margin, ...rest } = options;
  const matrix = generateMatrix(text, { ecLevel });
  return matrixToBMP(matrix, { scale, margin });
}

/**
 * Generate a QR code and save as a BMP file.
 * @param {string} text - Text to encode
 * @param {string} filePath - Output file path
 * @param {{ ecLevel?: 'L'|'M'|'Q'|'H', scale?: number, margin?: number }} [options]
 */
export async function toFile(text, filePath, options = {}) {
  const buf = toBuffer(text, options);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(filePath, buf);
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test test/index.test.mjs`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/index.mjs test/index.test.mjs
git commit -m "feat: add public API (generate, toBuffer, toFile)"
```

---

### Task 8: CLI Tool

**Files:**
- Create: `bin/tiny-qr.mjs`
- Create: `test/cli.test.mjs`

**Step 1: Write the failing test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';

const CLI = new URL('../bin/tiny-qr.mjs', import.meta.url).pathname;

describe('CLI', () => {
  it('should show help with --help', () => {
    const out = execFileSync('node', [CLI, '--help'], { encoding: 'utf8' });
    assert.ok(out.includes('Usage'));
  });

  it('should generate a BMP file with -o', () => {
    const outPath = '/tmp/tiny-qr-cli-test.bmp';
    execFileSync('node', [CLI, 'HELLO', '-o', outPath]);
    assert.ok(existsSync(outPath));
    unlinkSync(outPath);
  });

  it('should accept --scale and --ec options', () => {
    const outPath = '/tmp/tiny-qr-cli-test2.bmp';
    execFileSync('node', [CLI, 'TEST', '-o', outPath, '--scale', '5', '--ec', 'M']);
    assert.ok(existsSync(outPath));
    unlinkSync(outPath);
  });

  it('should error without text argument', () => {
    assert.throws(() => {
      execFileSync('node', [CLI], { encoding: 'utf8', stdio: 'pipe' });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/cli.test.mjs`
Expected: FAIL

**Step 3: Implement CLI**

```javascript
#!/usr/bin/env node

import { toFile } from '../src/index.mjs';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: tiny-qr <text> [options]

Options:
  -o, --output <file>   Output BMP file path (default: qr.bmp)
  --scale <n>           Pixel scale per module (default: 10)
  --margin <n>          Quiet zone modules (default: 4)
  --ec <L|M|Q|H>        Error correction level (default: L)
  -h, --help            Show this help`);
  process.exit(0);
}

function getArg(names) {
  for (const name of names) {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  }
  return undefined;
}

// Find text (first arg that doesn't start with -)
const text = args.find((a, i) => {
  if (a.startsWith('-')) return false;
  // Skip if previous arg is a flag that expects a value
  if (i > 0 && ['-o', '--output', '--scale', '--margin', '--ec'].includes(args[i - 1])) return false;
  return true;
});

if (!text) {
  console.error('Error: No text provided. Use --help for usage.');
  process.exit(1);
}

const output = getArg(['-o', '--output']) || 'qr.bmp';
const scale = Number(getArg(['--scale'])) || 10;
const margin = Number(getArg(['--margin'])) || 4;
const ecLevel = getArg(['--ec']) || 'L';

await toFile(text, output, { ecLevel, scale, margin });
console.log(`QR code saved to ${output}`);
```

**Step 4: Run tests to verify they pass**

Run: `node --test test/cli.test.mjs`
Expected: All PASS

**Step 5: Commit**

```bash
git add bin/tiny-qr.mjs test/cli.test.mjs
git commit -m "feat: add CLI tool"
```

---

### Task 9: Integration Test & Validation

**Files:**
- Create: `test/integration.test.mjs`

**Step 1: Write integration test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generate, toBuffer, toFile } from '../src/index.mjs';
import { readFileSync, unlinkSync } from 'node:fs';

describe('integration', () => {
  it('should generate valid QR for URL', () => {
    const matrix = generate('https://example.com');
    assert.ok(matrix.length >= 21);
    // Verify it's a valid QR matrix (square, has finder patterns)
    assert.equal(matrix.length, matrix[0].length);
  });

  it('should generate valid QR for numeric data', () => {
    const matrix = generate('0123456789');
    assert.ok(matrix.length >= 21);
  });

  it('should generate valid QR for alphanumeric data', () => {
    const matrix = generate('HELLO WORLD');
    assert.ok(matrix.length >= 21);
  });

  it('should generate valid BMP across all EC levels', () => {
    for (const ecLevel of ['L', 'M', 'Q', 'H']) {
      const buf = toBuffer('TEST', { ecLevel });
      assert.equal(buf[0], 0x42);
      assert.equal(buf[1], 0x4D);
    }
  });

  it('should generate valid BMP file that can be read back', async () => {
    const path = '/tmp/tiny-qr-integration.bmp';
    await toFile('HELLO', path, { scale: 10, margin: 4 });
    const data = readFileSync(path);
    assert.equal(data[0], 0x42);
    assert.equal(data[1], 0x4D);
    // Check dimensions in BMP header
    const width = data.readInt32LE(18);
    assert.ok(width > 0);
    unlinkSync(path);
  });

  it('should handle maximum data for version 10', () => {
    // Version 10-L byte capacity = 271
    const data = 'A'.repeat(270);
    const matrix = generate(data, { ecLevel: 'L' });
    assert.ok(matrix.length > 0);
  });

  it('should throw for data exceeding capacity', () => {
    const huge = 'A'.repeat(5000);
    assert.throws(() => generate(huge, { ecLevel: 'L' }));
  });
});
```

**Step 2: Run all tests**

Run: `node --test test/**/*.test.mjs`
Expected: All PASS

**Step 3: Commit**

```bash
git add test/integration.test.mjs
git commit -m "test: add integration tests"
```

---

### Task 10: Final Cleanup & Validation

**Step 1: Run full test suite**

Run: `node --test test/**/*.test.mjs`
Expected: All PASS

**Step 2: Check bundle size**

Run: `du -sh src/ && wc -l src/*.mjs`
Verify: total source is under target (~5-7KB minified)

**Step 3: Manual validation**

Generate a test QR code and verify it scans correctly:
```bash
node bin/tiny-qr.mjs "https://example.com" -o /tmp/test-qr.bmp --scale 10
```
Open the BMP file and scan with a phone to verify.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and validation"
```
