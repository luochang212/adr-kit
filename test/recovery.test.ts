import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { updateCommand } from '../src/commands/update.js';
import { validateCommand } from '../src/commands/validate.js';
import { initRepository } from '../src/core/repository.js';

const tempDirs: string[] = [];

function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-recovery-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('repairing a partial ADR Kit repository', () => {
  it('preserves edited integrations while restoring missing ones', () => {
    const root = temp();
    initCommand(root, 'claude');
    const edited = [
      '.agents/skills/adrkit-record/SKILL.md',
      '.agents/commands/adrkit-record.md',
      '.agents/skills/adrkit-visualize/examples/decision-atlas.html',
      '.claude/skills/adrkit-record/SKILL.md',
      '.claude/commands/adrkit-record.md',
    ];
    for (const path of edited) writeFileSync(join(root, path), 'user edits\n');
    const missing = '.agents/skills/adrkit-validate/SKILL.md';
    rmSync(join(root, missing));
    rmSync(join(root, 'adr/config.yaml'));

    const output = initCommand(root, 'claude');

    for (const path of edited) {
      expect(readFileSync(join(root, path), 'utf8'), path).toBe('user edits\n');
      expect(output).toContain(`preserved ${path}`);
    }
    expect(readFileSync(join(root, missing), 'utf8')).toContain('# ADR Kit Validate');
    expect(output).toContain(`created ${missing}`);
    // Refresh remains explicit: update still replaces generated integrations.
    updateCommand(root);
    for (const path of edited) expect(readFileSync(join(root, path), 'utf8')).not.toBe('user edits\n');
  });

  it('restores missing pieces through init instead of refusing', () => {
    const root = temp();
    initCommand(root);
    // User-owned content must survive a repair: an edited README and a record.
    writeFileSync(join(root, 'adr/README.md'), 'my own readme\n');
    mkdirSync(join(root, 'adr/implemented'), { recursive: true });
    writeFileSync(join(root, 'adr/implemented/1-keep.md'), 'a record to keep\n');
    rmSync(join(root, 'adr/config.yaml'));
    rmSync(join(root, 'adr/proposed'), { recursive: true, force: true });

    const output = initCommand(root);

    expect(output).toMatch(/Repaired the ADR Kit repository/);
    expect(existsSync(join(root, 'adr/config.yaml'))).toBe(true);
    expect(existsSync(join(root, 'adr/proposed/.gitkeep'))).toBe(true);
    expect(readFileSync(join(root, 'adr/README.md'), 'utf8')).toBe('my own readme\n');
    expect(readFileSync(join(root, 'adr/implemented/1-keep.md'), 'utf8')).toBe('a record to keep\n');
  });

  it('names the missing config and the repair command instead of advising init', () => {
    const root = temp();
    initCommand(root);
    rmSync(join(root, 'adr/config.yaml'));

    // The old message said "run adrkit init first", which init refused to do.
    expect(() => validateCommand(root)).toThrow(/config\.yaml is missing[\s\S]*adrkit init/);
  });

  it('repairs an empty adr/ left by an interrupted init', () => {
    const root = temp();
    mkdirSync(join(root, 'adr'), { recursive: true });

    initCommand(root);

    expect(validateCommand(root).valid).toBe(true);
  });

  it('still refuses a foreign adr/ directory that has content', () => {
    const root = temp();
    mkdirSync(join(root, 'adr'), { recursive: true });
    writeFileSync(join(root, 'adr', 'notes.txt'), 'not ours\n');

    expect(() => initRepository(root)).toThrow(/already exists/);
  });
});
