// Verify the fixes to the ab3ecaa review. Build first, then run with Node.
// The original defect scenarios now assert their corrected outcomes.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const load = (path) => import(new URL(`../../dist/${path}.js`, import.meta.url));
const { initRepository } = await load('core/repository');
const { validateCommand } = await load('commands/validate');
const { implementCommand } = await load('commands/implement');
const { archiveCommand } = await load('commands/archive');
const { supersedeCommand } = await load('commands/supersede');
const { instructionsCommand } = await load('commands/instructions');
const { relevantCommand } = await load('commands/relevant');
const { writtenHeadings } = await load('core/adr');
const work = fs.mkdtempSync(join(tmpdir(), 'adrkit-whole-review-'));
const make = () => { const root = fs.mkdtempSync(join(work, 'repo-')); initRepository(root); return root; };
const decision = (n) => `---\nstatus: implemented\ndate: 2026-10-20\nraised-by: human\ndecided-by: human\ncreated: 2026-10-20\n---\n\n# ADR: ${n} A${n}\n\n## Problem\nx\n## Decision\nx\n## Alternatives considered\nx\n## Consequences\nx\n`;
const proposal = (extra = '', acceptance = 'x', risks = 'x') => `---\nstatus: proposed\ndate: 2026-10-20\ncreated: 2026-10-20\n---\n\n# ADR: A\n\n## Problem\nx\n## Proposal\nx\n## Alternatives considered\nx\n## Acceptance criteria\n${acceptance}\n## Risks\n${risks}\n${extra}`;
const putDecision = (root, n, text = decision(n)) => fs.writeFileSync(join(root, `adr/implemented/${n}-a${n}.md`), text);
const putProposal = (root, text = proposal()) => fs.writeFileSync(join(root, 'adr/proposed/2026-10-20-a.md'), text);
try {
  {
    const root = make();
    putDecision(root, 1, decision(1).replace('## Problem', '<!--\n## Problem') + '-->\n');
    assert.equal(validateCommand(root).valid, false);
    assert.deepEqual(writtenHeadings('```html\n<!--\n```\n\n### Risks\nvisible', 3), ['Risks']);
    console.log('F2 fixed: invisible sections fail and visible H3 survives a fenced example');
  }
  {
    const root = make(); putProposal(root, proposal('## Decision\nCustom notes\n'));
    assert.equal(validateCommand(root).valid, true);
    assert.throws(() => implementCommand('A', root, 'human', 'human'), /duplicate section "## Decision"/);
    assert.equal(fs.existsSync(join(root, 'adr/proposed/2026-10-20-a.md')), true);
    assert.equal(fs.readdirSync(join(root, 'adr/implemented')).filter((name) => name.endsWith('.md')).length, 0);
    console.log('F3 fixed: conflicting promotion is rejected before any record move');
  }
  {
    const root = make(); putProposal(root); fs.writeFileSync(join(root, 'bad.ts'), '// @' + 'adr 999\n');
    assert.equal(validateCommand(root).valid, false);
    const text = instructionsCommand(root);
    assert.match(text, /validated - ready after shipping/);
    assert.match(text, /cites ADR 999, which does not exist/);
    console.log('F6 fixed: pending proposals and corpus issues are both reported');
  }
  {
    const root = make(); putProposal(root, proposal('', '<!-- todo -->', '<!-- todo -->'));
    assert.equal(validateCommand(root).valid, true);
    console.log('S1: existing content gate preserved; documentation now distinguishes required headings');
    putDecision(root, 1);
    assert.throws(() => supersedeCommand('1', 'A', root), /must be an implemented decision/);
    implementCommand('A', root, 'human', 'human');
    supersedeCommand('1', '2', root);
    assert.equal(validateCommand(root).valid, true);
    console.log('S2: full replacement succeeds after shipping and promotion');
  }
  {
    const root = make(); fs.mkdirSync(join(root, 'src')); fs.writeFileSync(join(root, 'src/cli.ts'), '');
    putDecision(root, 1, decision(1).replace('created: 2026-10-20', 'created: 2026-10-20\npaths: [src/cli*.ts]'));
    assert.match(relevantCommand(['src/cli.ts'], root).output, /\[1\]/);
    assert.equal(validateCommand(root).valid, true);
    console.log('F7 fixed: matching filename-prefix glob passes validation');
  }
  if (process.platform !== 'win32' && process.getuid?.() !== 0) {
    const root = make(); const path = join(root, 'bad.ts'); fs.writeFileSync(path, '// @' + 'adr 999\n');
    assert.equal(validateCommand(root).valid, false);
    fs.chmodSync(path, 0);
    try {
      assert.equal(validateCommand(root).valid, false);
      assert.match(validateCommand(root).output, /cannot read file for ADR citations/);
    }
    finally { fs.chmodSync(path, 0o600); }
    console.log('F5 fixed: unreadable source produces an explicit failed-scan diagnostic');
  }
  if (process.platform !== 'win32') {
    const root = make(); fs.mkdirSync(join(root, 'src')); fs.writeFileSync(join(root, 'real.ts'), '');
    fs.symlinkSync('../real.ts', join(root, 'src/linked.ts'));
    putDecision(root, 1, decision(1).replace('created: 2026-10-20', 'created: 2026-10-20\npaths: [src/linked.ts]'));
    assert.match(relevantCommand(['src/linked.ts'], root).output, /\[1\]/);
    const result = relevantCommand(['src'], root);
    assert.equal(result.complete, true); assert.match(result.output, /\[1\]/);
    console.log('F8 fixed: directory queries include symlink leaves');
  }
  {
    const root = make();
    fs.writeFileSync(join(root, 'adr/notes.md'), 'initial note\n');
    const url = new URL('../../dist/core/notes.js', import.meta.url).href;
    const code = `
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
const [root,id,url] = process.argv.slice(1);
const write = fs.writeFileSync;
const read = fs.readFileSync;
fs.readFileSync = function(path,...args) {
  const result = read(path,...args);
  if(path === join(root,'adr','notes.md')) {
    write(join(root,'ready-'+id),'');
    const until = Date.now()+5000;
    while(!fs.existsSync(join(root,'ready-'+(id==='a'?'b':'a')))) {
      if(Date.now()>until) throw new Error('barrier timeout');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);
    }
  }
  return result;
};
syncBuiltinESMExports();
const {appendNote} = await import(url);
appendNote(root,'note '+id);
`;
    await Promise.all(['a', 'b'].map((id) => new Promise((done, fail) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', code, root, id, url]);
      let errors = ''; child.stderr.on('data', (data) => { errors += data; });
      child.on('error', fail);
      child.on('exit', (status) => status === 0 ? done() : fail(new Error(errors)));
    })));
    const notes = fs.readFileSync(join(root, 'adr/notes.md'), 'utf8');
    assert.equal(notes.trim().split('\n').length, 3);
    assert.match(notes, /note a/); assert.match(notes, /note b/);
    console.log('F4 fixed: both concurrent notes and the original buffer are preserved');
  }
  if (process.platform !== 'win32') {
    const root = make(); for (let n = 1; n <= 5; n++) putDecision(root, n);
    for (let n = 1; n <= 4; n++) archiveCommand(String(n), 'x', root);
    const manifest = join(root, 'adr/archived/MANIFEST.json');
    const original = fs.readFileSync(manifest, 'utf8');
    const url = new URL('../../dist/commands/archive.js', import.meta.url).href;
    const python = 'import os,resource,signal,sys; resource.setrlimit(resource.RLIMIT_FSIZE,(550,550)); signal.signal(signal.SIGXFSZ,signal.SIG_IGN); os.execv(sys.argv[1],sys.argv[1:])';
    const code = `import {archiveCommand} from ${JSON.stringify(url)}; try {archiveCommand('5','x',${JSON.stringify(root)});}catch(e){console.log(e.code||e.message);}`;
    const child = spawnSync('python3', ['-c', python, process.execPath, '--input-type=module', '-e', code], { encoding: 'utf8', timeout: 5000 });
    assert.ifError(child.error); assert.equal(child.status, 0); assert.match(child.stdout, /EFBIG/);
    assert.equal(Buffer.byteLength(original), 522);
    assert.equal(fs.readFileSync(manifest, 'utf8'), original);
    assert.equal(JSON.parse(original).entries.length, 4);
    assert.equal(fs.existsSync(join(root, 'adr/implemented/5-a5.md')), true);
    assert.equal(fs.existsSync(join(root, 'adr/archived/5-a5.md')), false);
    console.log('F1 fixed: real EFBIG preserves all prior manifest bytes and the active source');
  }
  if (process.platform !== 'win32') {
    const root = make(); const manifest = join(root, 'adr/archived/MANIFEST.json');
    fs.unlinkSync(manifest); fs.symlinkSync('/dev/zero', manifest);
    const url = new URL('../../dist/commands/validate.js', import.meta.url).href;
    const code = `import {validateCommand} from ${JSON.stringify(url)}; console.log('starting validation'); console.log(validateCommand(${JSON.stringify(root)}));`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' });
    assert.ifError(child.error); assert.equal(child.status, 0);
    assert.match(child.stdout, /not a regular file \(character device\)/);
    console.log('F9 fixed: device manifest is rejected promptly without reading');
  }
  console.log('All applicable post-fix verification scenarios passed. No production files modified.');
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
