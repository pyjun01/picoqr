import { build } from 'esbuild';
import { rm, readFile, writeFile } from 'node:fs/promises';

// Clean dist/
await rm('dist', { recursive: true, force: true });

// ESM library bundle
await build({
  bundle: true,
  platform: 'node',
  target: 'node20',
  minify: true,
  entryPoints: ['src/index.mjs'],
  outfile: 'dist/index.mjs',
  format: 'esm',
});

// CLI — thin wrapper that imports from the bundled library
const cliSrc = await readFile('bin/picoqr.mjs', 'utf8');
const cliOut = cliSrc.replace('../src/index.mjs', './index.mjs');
await writeFile('dist/cli.mjs', cliOut);

console.log('Build complete: dist/index.mjs, dist/cli.mjs');
