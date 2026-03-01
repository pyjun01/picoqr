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
    const matrix = generateMatrix('01234567', { ecLevel: 'M' });
    assert.equal(matrix.length, 21);
    assert.equal(matrix[0].length, 21);
  });

  it('should have correct dimensions for higher versions', () => {
    const long = 'HTTPS://EXAMPLE.COM/PATH/TO/RESOURCE';
    const matrix = generateMatrix(long, { ecLevel: 'L' });
    const size = matrix.length;
    assert.ok(size > 21);
    assert.equal(size, matrix[0].length);
    assert.equal((size - 17) % 4, 0);
  });

  it('should have finder patterns in corners', () => {
    const matrix = generateMatrix('TEST', { ecLevel: 'L' });
    const size = matrix.length;
    // Top-left finder pattern
    assert.equal(matrix[0][0], true);
    assert.equal(matrix[0][6], true);
    assert.equal(matrix[6][0], true);
    assert.equal(matrix[6][6], true);
    assert.equal(matrix[1][1], false);  // inner light
    assert.equal(matrix[3][3], true);   // center dark
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

  it('should have timing patterns', () => {
    const matrix = generateMatrix('TEST', { ecLevel: 'L' });
    // Row 6 timing pattern: alternating dark/light starting with dark at col 8
    // Col 6 timing pattern: same vertically
    assert.equal(matrix[6][8], true);   // dark
    assert.equal(matrix[6][9], false);  // light
    assert.equal(matrix[6][10], true);  // dark
    assert.equal(matrix[8][6], true);
    assert.equal(matrix[9][6], false);
    assert.equal(matrix[10][6], true);
  });

  it('should work with all EC levels', () => {
    for (const ecLevel of ['L', 'M', 'Q', 'H']) {
      const matrix = generateMatrix('HELLO', { ecLevel });
      assert.ok(matrix.length >= 21);
      assert.equal(matrix.length, matrix[0].length);
    }
  });

  it('should default to EC level L', () => {
    const m1 = generateMatrix('HELLO');
    const m2 = generateMatrix('HELLO', { ecLevel: 'L' });
    assert.deepEqual(m1, m2);
  });

  it('should have dark module at correct position', () => {
    // Version 1: dark module at (4*1+9, 8) = (13, 8)
    // But for alphanumeric "TEST" it might be version 1 or 2
    const matrix = generateMatrix('01234567', { ecLevel: 'M' });
    // Version 1 (21x21), dark module at row 13, col 8
    assert.equal(matrix[13][8], true);
  });

  it('should handle numeric, alphanumeric, and byte modes', () => {
    const numeric = generateMatrix('12345');
    const alpha = generateMatrix('HELLO');
    const byte_ = generateMatrix('hello');
    assert.ok(numeric.length >= 21);
    assert.ok(alpha.length >= 21);
    assert.ok(byte_.length >= 21);
  });
});
