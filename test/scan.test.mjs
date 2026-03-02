import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import jsQR from 'jsqr';
import { toBuffer } from '../src/index.mjs';

/**
 * Convert a 24-bit BGR bottom-up BMP buffer to an RGBA Uint8ClampedArray.
 * Only handles the exact BMP format produced by tiny-qr (no compression, 24bpp).
 *
 * @param {Buffer} bmp - BMP file buffer
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
function bmpToRGBA(bmp) {
  const pixelOffset = bmp.readUInt32LE(10);
  const width = bmp.readInt32LE(18);
  const height = bmp.readInt32LE(22);
  const bpp = bmp.readUInt16LE(28);
  assert.equal(bpp, 24, 'Only 24-bit BMP supported');

  const rowBytes = width * 3;
  const rowPadding = (4 - (rowBytes % 4)) % 4;
  const paddedRowBytes = rowBytes + rowPadding;

  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    // BMP rows are stored bottom-up
    const srcRow = pixelOffset + (height - 1 - y) * paddedRowBytes;
    for (let x = 0; x < width; x++) {
      const srcPx = srcRow + x * 3;
      const dstPx = (y * width + x) * 4;
      rgba[dstPx] = bmp[srcPx + 2];     // R (from BGR)
      rgba[dstPx + 1] = bmp[srcPx + 1]; // G
      rgba[dstPx + 2] = bmp[srcPx];     // B
      rgba[dstPx + 3] = 255;            // A (opaque)
    }
  }

  return { data: rgba, width, height };
}

/**
 * Generate a QR BMP and decode it via jsQR, returning the decoded string.
 * @param {string} text
 * @param {object} [options]
 * @returns {string} decoded text
 */
function scanQR(text, options = {}) {
  const bmp = toBuffer(text, { scale: 10, margin: 4, ...options });
  const { data, width, height } = bmpToRGBA(bmp);
  const result = jsQR(data, width, height);
  assert.ok(result, `jsQR failed to decode QR for: "${text.slice(0, 50)}"`);
  return result.data;
}

describe('scan verification', () => {
  it('should scan URL text', () => {
    const text = 'https://example.com';
    assert.equal(scanQR(text), text);
  });

  it('should scan numeric data', () => {
    const text = '0123456789';
    assert.equal(scanQR(text), text);
  });

  it('should scan alphanumeric data', () => {
    const text = 'HELLO WORLD';
    assert.equal(scanQR(text), text);
  });

  it('should scan byte mode data', () => {
    const text = 'hello world';
    assert.equal(scanQR(text), text);
  });

  it('should scan with EC level L', () => {
    const text = 'EC-LEVEL-L';
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan with EC level M', () => {
    const text = 'EC-LEVEL-M';
    assert.equal(scanQR(text, { ecLevel: 'M' }), text);
  });

  it('should scan with EC level Q', () => {
    const text = 'EC-LEVEL-Q';
    assert.equal(scanQR(text, { ecLevel: 'Q' }), text);
  });

  it('should scan with EC level H', () => {
    const text = 'EC-LEVEL-H';
    assert.equal(scanQR(text, { ecLevel: 'H' }), text);
  });

  it('should scan long data at version 6', () => {
    // Version 6-L: 195 alphanumeric chars (max for v6-L)
    const text = 'A'.repeat(195);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan version 7 QR code', () => {
    // Version 7-L starts at 196+ alphanumeric chars
    const text = 'A'.repeat(196);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan version 8 QR code', () => {
    const text = 'A'.repeat(250);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan version 10 QR code', () => {
    const text = 'A'.repeat(270);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan version 11 QR code', () => {
    // Version 11-L byte capacity: 324 bytes
    const text = 'a'.repeat(280);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan version 14 QR code', () => {
    // Version 14 is the first version with 4 alignment coordinates [6,26,46,66]
    const text = 'a'.repeat(330);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan version 15 QR code', () => {
    // Version 15-L byte capacity: 523 bytes
    const text = 'a'.repeat(500);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });

  it('should scan version 15 QR code with EC-M', () => {
    // Version 15-M: 10 blocks (5x41 + 5x42), different interleaving from EC-L
    const text = 'a'.repeat(410);
    assert.equal(scanQR(text, { ecLevel: 'M' }), text);
  });

  it('should scan version 15 at max capacity', () => {
    // Version 15-L: 523 data codewords = 4184 bits
    // Byte mode overhead: 4 (mode) + 16 (char count) = 20 bits
    // Max payload: floor((4184 - 20) / 8) = 520 bytes
    const text = 'a'.repeat(520);
    assert.equal(scanQR(text, { ecLevel: 'L' }), text);
  });
});
