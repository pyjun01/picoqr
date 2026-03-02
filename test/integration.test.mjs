import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generate, toBuffer, toFile } from '../src/index.mjs';
import { readFileSync, unlinkSync } from 'node:fs';

describe('integration', () => {
  it('should generate valid QR for URL', () => {
    const matrix = generate('https://example.com');
    assert.ok(matrix.length >= 21);
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

  it('should generate valid BMP file', async () => {
    const path = '/tmp/picoqr-integration.bmp';
    await toFile('HELLO', path, { scale: 10, margin: 4 });
    const data = readFileSync(path);
    assert.equal(data[0], 0x42);
    assert.equal(data[1], 0x4D);
    const width = data.readInt32LE(18);
    assert.ok(width > 0);
    unlinkSync(path);
  });

  it('should handle long data near version boundary', () => {
    // Version 10-L byte capacity is 271
    const data = 'A'.repeat(270);
    const matrix = generate(data, { ecLevel: 'L' });
    assert.ok(matrix.length > 0);
    assert.equal(matrix.length, matrix[0].length);
  });

  it('should throw for data exceeding capacity', () => {
    const huge = 'A'.repeat(5000);
    assert.throws(() => generate(huge, { ecLevel: 'L' }));
  });

  it('should produce no null modules in any matrix', () => {
    for (const text of ['1', 'HELLO', 'https://example.com']) {
      const matrix = generate(text);
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          assert.equal(typeof matrix[r][c], 'boolean',
            `Null at (${r},${c}) for "${text}"`);
        }
      }
    }
  });

  it('should generate different matrices for different inputs', () => {
    const m1 = generate('A');
    const m2 = generate('B');
    // At least one module should differ
    let hasDiff = false;
    for (let r = 0; r < m1.length && !hasDiff; r++) {
      for (let c = 0; c < m1[r].length && !hasDiff; c++) {
        if (m1[r][c] !== m2[r][c]) hasDiff = true;
      }
    }
    assert.ok(hasDiff, 'Matrices for different inputs should differ');
  });

  it('should generate larger matrix for higher EC level', () => {
    // Same data, higher EC may need bigger version
    const data = 'A'.repeat(15);  // Fits V1-L (17 byte capacity) but not V1-H (7 byte capacity)
    const mL = generate(data, { ecLevel: 'L' });
    const mH = generate(data, { ecLevel: 'H' });
    assert.ok(mH.length >= mL.length);
  });
});
