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

  it('should have pixel data offset of 54', () => {
    const matrix = [[true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    const offset = buf.readUInt32LE(10);
    assert.equal(offset, 54);
  });

  it('should scale pixels correctly', () => {
    const matrix = [[true]];
    const scale = 4;
    const buf = matrixToBMP(matrix, { scale, margin: 0 });
    const width = buf.readInt32LE(18);
    const height = buf.readInt32LE(22);
    assert.equal(width, 4);
    assert.equal(Math.abs(height), 4);
  });

  it('should add margin correctly', () => {
    const matrix = [[true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 4 });
    const width = buf.readInt32LE(18);
    assert.equal(width, 9); // 1 + 2*4
  });

  it('should encode dark as black and light as white', () => {
    const matrix = [[true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    // Pixel at offset 54 should be black (0,0,0)
    assert.equal(buf[54], 0x00);
    assert.equal(buf[55], 0x00);
    assert.equal(buf[56], 0x00);
  });

  it('should encode light module as white', () => {
    const matrix = [[false]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    assert.equal(buf[54], 0xFF);
    assert.equal(buf[55], 0xFF);
    assert.equal(buf[56], 0xFF);
  });

  it('should use default scale and margin', () => {
    const matrix = [[true, false], [false, true]];
    const buf = matrixToBMP(matrix);
    const width = buf.readInt32LE(18);
    // default scale=10, margin=4 -> 2*10 + 2*4 = 28
    assert.equal(width, 28);
  });

  it('should have correct file size in header', () => {
    const matrix = [[true]];
    const buf = matrixToBMP(matrix, { scale: 1, margin: 0 });
    const headerSize = buf.readUInt32LE(2);
    assert.equal(headerSize, buf.length);
  });
});
