import { build } from 'esbuild';
import { rm, readFile, writeFile } from 'node:fs/promises';

// Clean dist/
await rm('dist', { recursive: true, force: true });

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  minify: true,
};

await Promise.all([
  // ESM bundle
  build({
    ...shared,
    entryPoints: ['src/index.mjs'],
    outfile: 'dist/index.mjs',
    format: 'esm',
  }),
  // CJS bundle
  build({
    ...shared,
    entryPoints: ['src/index.mjs'],
    outfile: 'dist/index.cjs',
    format: 'cjs',
  }),
  // CLI bundle (ESM, no banner — shebang added after build)
  build({
    ...shared,
    entryPoints: ['bin/tiny-qr.mjs'],
    outfile: 'dist/cli.mjs',
    format: 'esm',
  }),
]);

// Replace source shebang with a clean one (esbuild preserves the original)
const cli = await readFile('dist/cli.mjs', 'utf8');
await writeFile('dist/cli.mjs', '#!/usr/bin/env node\n' + cli.replace(/^#!.*\n/, ''));

console.log('Build complete: dist/index.mjs, dist/index.cjs, dist/cli.mjs');
