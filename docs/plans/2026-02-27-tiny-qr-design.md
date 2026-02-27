# tiny-qr Design Document

## Goal
Ultra-lightweight, zero-dependency Node.js QR code generator.
Bundle size minimization is the #1 priority.

## Constraints
- Zero external npm dependencies (Node.js built-in modules only)
- Node.js 20+ / ESM-only
- QR Version 1-10 only (max 174 bytes @ EC Level L)
- BMP output format only

## QR Spec Coverage
| Item | Range |
|---|---|
| Version | 1-10 |
| Error Correction | L / M / Q / H (default: L) |
| Encoding Mode | Numeric, Alphanumeric, Byte (UTF-8) |
| Masking | All 8 mask patterns evaluated, optimal selected |

## Architecture

```
tiny-qr/
├── src/
│   ├── index.mjs          # Public API (generate, toBuffer, toFile)
│   ├── qr.mjs             # QR matrix generation core
│   ├── encode.mjs         # Numeric/Alphanumeric/Byte encoding
│   ├── ec.mjs             # Reed-Solomon error correction
│   ├── bmp.mjs            # BMP image encoder
│   └── tables.mjs         # Version/EC tables (v1-10 only)
├── bin/
│   └── tiny-qr.mjs        # CLI entrypoint
├── test/
│   └── ...
├── package.json
└── LICENSE
```

## Public API

```javascript
import { generate, toBuffer, toFile } from 'tiny-qr';

// Generate QR matrix (2D boolean array)
const matrix = generate('https://example.com', { ecLevel: 'L' });

// Generate BMP Buffer
const buf = toBuffer('https://example.com', { scale: 10, margin: 4 });

// Save BMP file
await toFile('https://example.com', './qr.bmp', { scale: 10 });
```

## CLI

```bash
npx tiny-qr "https://example.com" -o qr.bmp
npx tiny-qr "hello" --scale 20 --ec M -o output.bmp
```

## Key Design Decisions
1. **ESM-only** - No CJS wrapper needed, reduces bundle size
2. **Version 1-10 only tables** - Removes v11-40 data, significantly reduces tables file
3. **BMP single format** - No PNG/SVG encoder code needed
4. **Lazy fs import** - Works in environments where fs is unavailable

## Estimated Bundle Size
- Core logic: ~3-5KB (minified)
- Table data (v1-10): ~1-2KB
- **Total: ~5-7KB** (minified, 0 external dependencies)
