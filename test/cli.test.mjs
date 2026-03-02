import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';

const CLI = new URL('../bin/picoqr.mjs', import.meta.url).pathname;

describe('CLI', () => {
  it('should show help with --help', () => {
    const out = execFileSync('node', [CLI, '--help'], { encoding: 'utf8' });
    assert.ok(out.includes('Usage'));
  });

  it('should generate a BMP file with -o', () => {
    const outPath = '/tmp/picoqr-cli-test.bmp';
    execFileSync('node', [CLI, 'HELLO', '-o', outPath]);
    assert.ok(existsSync(outPath));
    unlinkSync(outPath);
  });

  it('should accept --scale and --ec options', () => {
    const outPath = '/tmp/picoqr-cli-test2.bmp';
    execFileSync('node', [CLI, 'TEST', '-o', outPath, '--scale', '5', '--ec', 'M']);
    assert.ok(existsSync(outPath));
    unlinkSync(outPath);
  });

  it('should error without text argument', () => {
    assert.throws(() => {
      execFileSync('node', [CLI], { encoding: 'utf8', stdio: 'pipe' });
    });
  });
});
