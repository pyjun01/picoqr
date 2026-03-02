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
  const { ecLevel, scale, margin } = options;
  const matrix = generateMatrix(text, { ecLevel });
  return matrixToBMP(matrix, { scale, margin });
}

/**
 * Generate a QR code and save as a BMP file.
 * @param {string} text - Text to encode
 * @param {string} filePath - Output file path
 * @param {{ ecLevel?: 'L'|'M'|'Q'|'H', scale?: number, margin?: number }} [options]
 * @returns {Promise<void>}
 */
export async function toFile(text, filePath, options = {}) {
  const buf = toBuffer(text, options);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(filePath, buf);
}
