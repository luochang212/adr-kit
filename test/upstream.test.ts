import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A throwaway copy of the assets and the gate script, so the real tree is untouched. */
function makeTree(): string {
  const root = mkdtempSync(join(tmpdir(), 'adrkit-upstream-'));
  tempDirs.push(root);
  cpSync(join(repoRoot, 'assets'), join(root, 'assets'), { recursive: true });
  cpSync(join(repoRoot, 'tools'), join(root, 'tools'), { recursive: true });
  return root;
}

describe('the upstream grilling gate', () => {
  it('fails when a vendored file no longer matches MANIFEST.json', () => {
    const root = makeTree();
    const vendored = join(root, 'assets', 'upstream', 'grilling', 'SKILL.md');
    writeFileSync(vendored, readFileSync(vendored, 'utf8') + '\nTAMPERED-BY-TEST\n');

    const result = spawnSync('node', [join(root, 'tools', 'check-grilling-upstream.mjs')], {
      encoding: 'utf8',
    });

    // The local check runs before the network, so a tampered copy fails offline.
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not match MANIFEST.json');
    expect(result.stderr).toContain('SKILL.md');
  });
});
