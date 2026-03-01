/**
 * Data encoding module for QR code generation.
 *
 * Encodes text into QR data codewords using numeric, alphanumeric,
 * or byte mode depending on the input content.
 *
 * @module encode
 */

import {
  DATA_CODEWORDS_TABLE,
  ALPHANUMERIC_CHARSET,
  CHAR_COUNT_BITS,
} from './tables.mjs';

/**
 * Internal helper class for writing individual bits and converting to bytes.
 */
class BitStream {
  constructor() {
    this.bits = [];
  }

  /**
   * Write a value as the specified number of bits (MSB first).
   *
   * @param {number} value - The integer value to write.
   * @param {number} length - The number of bits to write.
   */
  write(value, length) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >> i) & 1);
    }
  }

  /**
   * Convert the accumulated bits to a Uint8Array of bytes.
   *
   * @returns {Uint8Array} The byte array.
   */
  toBytes() {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) bytes[i >> 3] |= 1 << (7 - (i & 7));
    }
    return bytes;
  }
}

/**
 * Mode indicators (4-bit) for QR encoding modes.
 *
 * @type {Object<string, number>}
 */
const MODE_INDICATORS = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
};

/**
 * Detect the optimal encoding mode for the given text.
 *
 * - All digits: 'numeric'
 * - All characters in the QR alphanumeric charset: 'alphanumeric'
 * - Otherwise: 'byte'
 *
 * @param {string} text - The text to analyze.
 * @returns {'numeric' | 'alphanumeric' | 'byte'} The detected mode.
 */
export function detectMode(text) {
  if (/^\d+$/.test(text)) {
    return 'numeric';
  }

  for (let i = 0; i < text.length; i++) {
    if (!(text[i] in ALPHANUMERIC_CHARSET)) {
      return 'byte';
    }
  }

  return 'alphanumeric';
}

/**
 * Compute the number of data bits required for encoding the text
 * in the given mode (excluding mode indicator and character count).
 *
 * @param {string} text - The text to encode.
 * @param {'numeric' | 'alphanumeric' | 'byte'} mode - The encoding mode.
 * @returns {number} The number of data bits.
 */
function computeDataBits(text, mode) {
  const len = mode === 'byte'
    ? new TextEncoder().encode(text).length
    : text.length;

  if (mode === 'numeric') {
    return Math.floor(len / 3) * 10
      + (len % 3 === 2 ? 7 : len % 3 === 1 ? 4 : 0);
  }
  if (mode === 'alphanumeric') {
    return Math.floor(len / 2) * 11 + (len % 2 ? 6 : 0);
  }
  // byte
  return len * 8;
}

/**
 * Compute the total number of bits needed to encode text at a given version.
 *
 * @param {string} text - The text to encode.
 * @param {'numeric' | 'alphanumeric' | 'byte'} mode - The encoding mode.
 * @param {number} version - The QR version (1-10).
 * @returns {number} Total bits needed.
 */
function computeTotalBits(text, mode, version) {
  const charCountLen = CHAR_COUNT_BITS[version][mode];
  return 4 + charCountLen + computeDataBits(text, mode);
}

/**
 * Select the smallest QR version (1-10) that can hold the given text
 * at the specified error correction level.
 *
 * @param {string} text - The text to encode.
 * @param {'L' | 'M' | 'Q' | 'H'} ecLevel - The error correction level.
 * @returns {number} The version number (1-10).
 * @throws {Error} If the data is too large for version 10.
 */
export function selectVersion(text, ecLevel) {
  const mode = detectMode(text);

  for (let v = 1; v <= 10; v++) {
    const totalBits = computeTotalBits(text, mode, v);
    const dataCodewords = DATA_CODEWORDS_TABLE[v][ecLevel];
    const availableBits = dataCodewords * 8;

    if (totalBits <= availableBits) {
      return v;
    }
  }

  throw new Error('Data too large for versions 1-10');
}

/**
 * Encode text into QR data codewords as a Uint8Array.
 *
 * Produces the complete data codeword sequence including mode indicator,
 * character count, encoded data, terminator, byte alignment, and pad codewords.
 *
 * @param {string} text - The text to encode.
 * @param {number} version - The QR version (1-10).
 * @param {'L' | 'M' | 'Q' | 'H'} ecLevel - The error correction level.
 * @returns {Uint8Array} The data codewords.
 */
export function encodeBits(text, version, ecLevel) {
  const mode = detectMode(text);
  const totalDataCodewords = DATA_CODEWORDS_TABLE[version][ecLevel];
  const totalDataBits = totalDataCodewords * 8;
  const stream = new BitStream();

  // 1. Mode indicator (4 bits)
  stream.write(MODE_INDICATORS[mode], 4);

  // 2. Character count indicator
  const charCountLen = CHAR_COUNT_BITS[version][mode];
  const charCount = mode === 'byte'
    ? new TextEncoder().encode(text).length
    : text.length;
  stream.write(charCount, charCountLen);

  // 3. Data encoding
  if (mode === 'numeric') {
    encodeNumeric(stream, text);
  } else if (mode === 'alphanumeric') {
    encodeAlphanumeric(stream, text);
  } else {
    encodeBytes(stream, text);
  }

  // 4. Terminator: up to 4 zero bits, but don't exceed capacity
  const terminatorLen = Math.min(4, totalDataBits - stream.bits.length);
  if (terminatorLen > 0) {
    stream.write(0, terminatorLen);
  }

  // 5. Byte alignment: pad to next byte boundary
  const remainder = stream.bits.length % 8;
  if (remainder > 0) {
    stream.write(0, 8 - remainder);
  }

  // 6. Pad codewords: alternate 0xEC and 0x11
  const padBytes = [0xEC, 0x11];
  let padIndex = 0;
  while (stream.bits.length < totalDataBits) {
    stream.write(padBytes[padIndex], 8);
    padIndex = (padIndex + 1) % 2;
  }

  return stream.toBytes();
}

/**
 * Encode digits in numeric mode into the bit stream.
 *
 * Groups of 3 digits are encoded as 10-bit values, 2 remaining as 7-bit,
 * and 1 remaining as 4-bit.
 *
 * @param {BitStream} stream - The bit stream to write to.
 * @param {string} text - The digit string.
 */
function encodeNumeric(stream, text) {
  let i = 0;
  while (i + 2 < text.length) {
    const group = parseInt(text.substring(i, i + 3), 10);
    stream.write(group, 10);
    i += 3;
  }
  if (text.length - i === 2) {
    const group = parseInt(text.substring(i, i + 2), 10);
    stream.write(group, 7);
  } else if (text.length - i === 1) {
    const group = parseInt(text[i], 10);
    stream.write(group, 4);
  }
}

/**
 * Encode characters in alphanumeric mode into the bit stream.
 *
 * Pairs of characters are encoded as 11-bit values (first*45 + second),
 * and 1 remaining character as 6-bit.
 *
 * @param {BitStream} stream - The bit stream to write to.
 * @param {string} text - The alphanumeric string.
 */
function encodeAlphanumeric(stream, text) {
  let i = 0;
  while (i + 1 < text.length) {
    const val = ALPHANUMERIC_CHARSET[text[i]] * 45 + ALPHANUMERIC_CHARSET[text[i + 1]];
    stream.write(val, 11);
    i += 2;
  }
  if (i < text.length) {
    stream.write(ALPHANUMERIC_CHARSET[text[i]], 6);
  }
}

/**
 * Encode text in byte mode (UTF-8) into the bit stream.
 *
 * Each byte of the UTF-8 encoded text is written as 8 bits.
 *
 * @param {BitStream} stream - The bit stream to write to.
 * @param {string} text - The text to encode.
 */
function encodeBytes(stream, text) {
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i++) {
    stream.write(bytes[i], 8);
  }
}
