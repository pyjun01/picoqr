#!/usr/bin/env node

import { toFile } from '../src/index.mjs';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: tiny-qr <text> [options]

Options:
  -o, --output <file>   Output BMP file path (default: qr.bmp)
  --scale <n>           Pixel scale per module (default: 10)
  --margin <n>          Quiet zone modules (default: 4)
  --ec <L|M|Q|H>        Error correction level (default: L)
  -h, --help            Show this help`);
  process.exit(0);
}

function getArg(names) {
  for (const name of names) {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  }
  return undefined;
}

// Find text (first arg that doesn't start with - and isn't a flag value)
const flagsWithValues = ['-o', '--output', '--scale', '--margin', '--ec'];
const text = args.find((a, i) => {
  if (a.startsWith('-')) return false;
  if (i > 0 && flagsWithValues.includes(args[i - 1])) return false;
  return true;
});

if (!text) {
  console.error('Error: No text provided. Use --help for usage.');
  process.exit(1);
}

const output = getArg(['-o', '--output']) || 'qr.bmp';
const scale = Number(getArg(['--scale'])) || 10;
const margin = Number(getArg(['--margin'])) || 4;
const ecLevel = getArg(['--ec']) || 'L';

await toFile(text, output, { ecLevel, scale, margin });
console.log(`QR code saved to ${output}`);
