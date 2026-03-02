# picoqr

Ultra-lightweight, zero-dependency QR code generator for Node.js.

**6.8 kB published** / 4.2 kB gzipped (library only) — built to embed into size-sensitive environments where every kilobyte counts.

## Use Cases

- **CLI tools** — add QR output without inflating your dependency tree
- **Thermal/receipt printers** — BMP pixel data maps directly to ESC/POS raster commands, no image conversion needed
- **Serverless functions** — zero deps means near-zero cold start overhead
- **Docker Alpine** — pure JS, no native bindings, no `node-gyp` build step
- **IoT / ARM devices** — no cross-compilation issues

## Why BMP?

Most QR libraries depend on canvas, libpng, or sharp for image output. These bring native bindings, platform-specific binaries, and painful installs on constrained environments.

BMP is an uncompressed bitmap format — encoding it is just raw pixel math. This is what keeps picoqr at zero dependencies. And for thermal printers (ESC/POS), raw bitmap is the native input format, making BMP the shortest path from QR matrix to printed output.

If you need SVG or PNG, use `generate()` to get the raw boolean matrix and render it yourself.

## Install

```bash
npm install picoqr
```

## API

### `generate(text, options?)`

Returns a QR code as a 2D boolean matrix (`true` = dark module).

```js
import { generate } from 'picoqr';

const matrix = generate('https://example.com');
// matrix[row][col] === true means dark module
```

### `toBuffer(text, options?)`

Returns a QR code as a BMP image `Buffer`.

```js
import { toBuffer } from 'picoqr';

const bmp = toBuffer('https://example.com', { scale: 8, margin: 2 });
```

### `toFile(text, filePath, options?)`

Writes a QR code BMP image to disk.

```js
import { toFile } from 'picoqr';

await toFile('https://example.com', 'qr.bmp', { ecLevel: 'M' });
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ecLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | `'L'` | Error correction level |
| `scale` | `number` | `10` | Pixels per QR module |
| `margin` | `number` | `4` | Quiet zone width in modules |

## CLI

```bash
npx picoqr "https://example.com" -o code.bmp
```

```
Usage: picoqr <text> [options]

Options:
  -o, --output <file>   Output BMP file path (default: qr.bmp)
  --scale <n>           Pixel scale per module (default: 10)
  --margin <n>          Quiet zone modules (default: 4)
  --ec <L|M|Q|H>        Error correction level (default: L)
  -h, --help            Show this help
```

## Size Comparison

| Package | Deps | Install size |
|---------|------|-------------|
| [qrcode](https://www.npmjs.com/package/qrcode) | 41 | ~135 kB |
| [@paulmillr/qr](https://github.com/paulmillr/qr) | 0 | ~35 kB |
| **picoqr** | **0** | **~6.8 kB** |

## QR Versions

Supports versions 1–15, covering up to **523 characters** (EC level L). Handles URLs, WiFi configs, contact cards, and most real-world payloads.

## Requirements

Node.js >= 20.0.0

## License

MIT
