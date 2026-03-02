/**
 * Minimal BMP image encoder.
 * Converts a QR matrix (boolean[][]) to a 24-bit uncompressed BMP image.
 *
 * @param {boolean[][]} matrix - QR code matrix where true = dark module
 * @param {object} [options]
 * @param {number} [options.scale=10] - Pixel scale factor per module
 * @param {number} [options.margin=4] - Quiet zone margin in modules
 * @returns {Buffer} BMP file data
 */
export function matrixToBMP(matrix, { scale = 10, margin = 4 } = {}) {
  const qrSize = matrix.length;
  const imgSize = qrSize * scale + margin * 2;
  const rowBytes = imgSize * 3;
  const rowPadding = (4 - (rowBytes % 4)) % 4;
  const paddedRowBytes = rowBytes + rowPadding;
  const pixelDataSize = paddedRowBytes * imgSize;
  const fileSize = 54 + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  // File header (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  // bytes 6-9 reserved (already 0)
  buf.writeUInt32LE(54, 10); // pixel data offset

  // DIB header (40 bytes, BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14);            // header size
  buf.writeInt32LE(imgSize, 18);        // width
  buf.writeInt32LE(imgSize, 22);        // height (positive = bottom-up)
  buf.writeUInt16LE(1, 26);             // planes
  buf.writeUInt16LE(24, 28);            // bits per pixel
  // bytes 30-33 compression (0)
  buf.writeUInt32LE(pixelDataSize, 34); // image size
  // bytes 38-53 resolution, colors (all 0, already initialized)

  // Pixel data (bottom-up row order)
  for (let y = imgSize - 1; y >= 0; y--) {
    const rowOffset = 54 + (imgSize - 1 - y) * paddedRowBytes;
    for (let x = 0; x < imgSize; x++) {
      const mx = Math.floor((x - margin) / scale);
      const my = Math.floor((y - margin) / scale);
      const isDark = mx >= 0 && mx < qrSize
        && my >= 0 && my < qrSize
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
