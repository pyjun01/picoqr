// Reed-Solomon error correction using Galois Field GF(256)
// Primitive polynomial: 0x11D (x^8 + x^4 + x^3 + x^2 + 1)

// Build GF(256) log and antilog (EXP) tables at module load time
const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
let val = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = val;
  LOG[val] = i;
  val = (val << 1) ^ (val >= 128 ? 0x11D : 0);
}
EXP[255] = EXP[0];

/**
 * Multiply two values in GF(256) using log/antilog tables.
 * @param {number} a - First operand (0-255)
 * @param {number} b - Second operand (0-255)
 * @returns {number} Product in GF(256)
 */
function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

/**
 * Generate Reed-Solomon error correction codewords for the given data.
 * @param {Uint8Array} data - Data codewords
 * @param {number} ecCount - Number of error correction codewords to generate
 * @returns {Uint8Array} New Uint8Array containing EC codewords
 */
export function generateECCodewords(data, ecCount) {
  // Build generator polynomial
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], EXP[i]);
    }
    gen = next;
  }

  // Polynomial division: data / generator, remainder = EC codewords
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }

  // Return a new Uint8Array (not a subarray view)
  return new Uint8Array(msg.subarray(data.length));
}
