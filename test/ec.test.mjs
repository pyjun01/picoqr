import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateECCodewords } from '../src/ec.mjs';

describe('generateECCodewords', () => {
  it('should generate correct number of EC codewords', () => {
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

  it('should produce values in range 0-255', () => {
    const data = new Uint8Array([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]);
    const ec = generateECCodewords(data, 13);
    assert.equal(ec.length, 13);
    for (const b of ec) {
      assert.ok(b >= 0 && b <= 255, `EC byte ${b} out of range`);
    }
  });

  it('should return a NEW Uint8Array (not a view)', () => {
    const data = new Uint8Array([1, 2, 3]);
    const ec = generateECCodewords(data, 5);
    assert.ok(ec instanceof Uint8Array);
    assert.equal(ec.length, 5);
  });

  it('should handle different EC counts', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    for (const count of [7, 10, 13, 15, 17, 18, 20, 22, 24, 26, 28, 30]) {
      const ec = generateECCodewords(data, count);
      assert.equal(ec.length, count, `Expected ${count} EC codewords`);
    }
  });

  it('should produce known test vector for Version 1-M "HELLO WORLD"', () => {
    // V1-M data codewords for "HELLO WORLD" in alphanumeric mode:
    // [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]
    const data = new Uint8Array([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]);
    const ec = generateECCodewords(data, 10);
    assert.equal(ec.length, 10);
    // Known EC codewords for this data: 196, 35, 39, 119, 235, 215, 231, 226, 93, 23
    assert.deepEqual(Array.from(ec), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });
});
