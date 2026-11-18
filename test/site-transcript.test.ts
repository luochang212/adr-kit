import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { todayStamp } from '../src/core/adr.js';
import { initRepository } from '../src/core/repository.js';
import { implementCommand } from '../src/commands/implement.js';
import { proposeCommand } from '../src/commands/propose.js';
import { recordCommand } from '../src/commands/record.js';

// The homepage terminal claims "verified line-by-line against the shipped
// CLI", so a test verifies it: every out/ok line of the transcript must be a
// substring of what the real commands print in a fresh repository. Parsing
// the component source keeps the transcript authored in the site (the same
// heuristic docs.test.ts applies to ui.ts).
const demo = readFileSync(new URL('../site/src/components/TerminalDemo.astro', import.meta.url), 'utf8');

const tempDirs: string[] = [];
function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-transcript-'));
  tempDirs.push(dir);
  initRepository(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

interface DemoLine { kind: string; text: string }

function transcriptLines(): DemoLine[] {
  const block = demo.slice(demo.indexOf('const lines: Line[] = ['), demo.indexOf('];', demo.indexOf('const lines')));
  const lines: DemoLine[] = [];
  for (const match of block.matchAll(/\{ kind: '(\w+)', text: ('[^']*'|`[^`]*`) \}/g)) {
    let text = match[2]!;
    if (text.startsWith('`')) {
      // The one templated line carries the demo date; the test substitutes
      // the real stamp the way the component renders it.
      text = text.slice(1, -1).replace('${demoDate}', todayStamp());
    } else {
      text = text.slice(1, -1);
    }
    lines.push({ kind: match[1]!, text });
  }
  return lines;
}

describe('homepage terminal transcript', () => {
  it('mirrors the real record, propose, and implement output', () => {
    const root = makeRepo();
    // The transcript replays one scripted workflow: record, propose, fill the
    // proposal, implement. The demo date is decorative; the numbers 1 and 2
    // come from a fresh repository, matching the demo's fresh-visit framing.
    const outputs = [
      recordCommand('Use SQLite for session storage', root, 'human', 'human'),
      proposeCommand('Use Redis for session storage', root),
      (() => {
        const path = join(root, 'adr/proposed');
        const file = `${todayStamp()}-use-redis-for-session-storage.md`;
        // "A proposal is scripted as filled before implementation": the
        // placeholder comments and the empty description stand in for the
        // author's written sections.
        writeFileSync(
          join(path, file),
          readFileSync(join(path, file), 'utf8')
            .replace(/<!--[\s\S]*?-->/g, 'Filled.')
            .replace(/description: ['"]{2}/, 'description: Read when the session storage changes.'),
        );
        return implementCommand('Use Redis for session storage', root, 'human', 'human');
      })(),
    ].join('\n');

    const lines = transcriptLines();
    expect(lines.length).toBeGreaterThan(10);
    for (const line of lines) {
      if (line.kind !== 'out' && line.kind !== 'ok') continue;
      expect(outputs).toContain(line.text);
    }
  });
});
