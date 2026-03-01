import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { encodeBits, detectMode, selectVersion } from '../src/encode.mjs';

describe('detectMode', () => {
  it('should detect numeric mode', () => {
    assert.equal(detectMode('12345'), 'numeric');
    assert.equal(detectMode('0'), 'numeric');
  });

  it('should detect alphanumeric mode', () => {
    assert.equal(detectMode('HELLO WORLD'), 'alphanumeric');
    assert.equal(detectMode('ABC123'), 'alphanumeric');
    assert.equal(detectMode('HELLO'), 'alphanumeric');
  });

  it('should detect byte mode for lowercase', () => {
    assert.equal(detectMode('hello'), 'byte');
  });

  it('should detect byte mode for URLs', () => {
    assert.equal(detectMode('https://example.com'), 'byte');
  });
});

describe('selectVersion', () => {
  it('should select version 1 for short numeric data', () => {
    // V1-L numeric capacity: 41 chars
    assert.equal(selectVersion('01234567', 'L'), 1);
  });

  it('should select version 1 for short alphanumeric', () => {
    // V1-L alphanumeric capacity: 25 chars
    assert.equal(selectVersion('HELLO', 'L'), 1);
  });

  it('should select higher version for longer data', () => {
    const long = 'A'.repeat(30);  // exceeds V1-L alphanumeric (25)
    const v = selectVersion(long, 'L');
    assert.ok(v > 1);
  });

  it('should throw for data too large', () => {
    const huge = 'a'.repeat(5000);
    assert.throws(() => selectVersion(huge, 'L'), /too large/i);
  });

  it('should consider EC level in version selection', () => {
    // Same data might need higher version with stricter EC
    const data = 'A'.repeat(20);
    const vL = selectVersion(data, 'L');
    const vH = selectVersion(data, 'H');
    assert.ok(vH >= vL);
  });
});

describe('encodeBits', () => {
  it('should return Uint8Array', () => {
    const bits = encodeBits('01234567', 1, 'L');
    assert.ok(bits instanceof Uint8Array);
  });

  it('should produce correct length for V1-L (19 data codewords)', () => {
    const bits = encodeBits('01234567', 1, 'L');
    assert.equal(bits.length, 19);
  });

  it('should encode numeric data', () => {
    // "01234567" numeric encoding:
    // Mode: 0001 (4 bits)
    // Count: 8 in 10 bits = 0000001000
    // Data: 012->12 (10 bits), 345->345 (10 bits), 67->67 (7 bits)
    // Total data bits: 4 + 10 + 10 + 10 + 7 = 41 bits
    const bits = encodeBits('01234567', 1, 'L');
    // First byte should start with 0001 (numeric mode) + first 4 bits of count
    assert.equal((bits[0] >> 4) & 0xF, 1); // mode indicator = 0001
  });

  it('should encode alphanumeric data', () => {
    const bits = encodeBits('HELLO', 1, 'L');
    assert.equal((bits[0] >> 6) & 0x3, 0); // mode = 0010, top 2 bits = 00
    assert.equal((bits[0] >> 4) & 0xF, 2); // mode indicator = 0010
  });

  it('should encode byte data', () => {
    const bits = encodeBits('hello', 2, 'L');
    assert.equal((bits[0] >> 4) & 0xF, 4); // mode indicator = 0100
  });

  it('should use alternating pad bytes 0xEC and 0x11', () => {
    // Short data = lots of padding
    const bits = encodeBits('1', 1, 'L');  // 19 data codewords, very little actual data
    // After actual data, remaining bytes alternate 0xEC, 0x11
    // Find the pattern somewhere in the tail
    let foundPadding = false;
    for (let i = 2; i < bits.length - 1; i++) {
      if (bits[i] === 0xEC && bits[i + 1] === 0x11) {
        foundPadding = true;
        break;
      }
    }
    assert.ok(foundPadding, 'Should contain 0xEC 0x11 padding pattern');
  });

  it('should produce correct length for V2-M (28 data codewords)', () => {
    const bits = encodeBits('HELLO WORLD', 2, 'M');
    assert.equal(bits.length, 28);
  });
});
