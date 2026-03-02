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
    assert.equal(buf[0], 0x42);
    assert.equal(buf[1], 0x4D);
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
    unlinkSync(testPath);
  });

  it('should accept options', async () => {
    await toFile('HELLO', testPath, { scale: 5, ecLevel: 'Q' });
    assert.ok(existsSync(testPath));
    unlinkSync(testPath);
  });
});
