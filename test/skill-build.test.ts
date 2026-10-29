import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { WORKFLOWS } from '../src/core/tool-integrations.js';

it('builds skill exports from one source and installs the packed workflows outside the source tree', () => {
  const source = fileURLToPath(new URL('../', import.meta.url));
  const temp = mkdtempSync(join(tmpdir(), 'adrkit-skill-build-'));
  const fixture = join(temp, 'source');
  const npmCli = process.env.npm_execpath || (process.platform === 'win32'
    ? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
    : realpathSync(execFileSync('which', ['npm'], { encoding: 'utf8' }).trim()));
  const npm = (cwd: string, ...args: string[]) => execFileSync(process.execPath, [npmCli, ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    mkdirSync(fixture);
    for (const path of ['src', 'bin', 'package.json', 'tsconfig.json', 'README.md', 'LICENSE']) {
      cpSync(join(source, path), join(fixture, path), { recursive: true });
    }
    mkdirSync(join(fixture, 'tools'));
    cpSync(join(source, 'tools/build-workflow-skills.mjs'), join(fixture, 'tools/build-workflow-skills.mjs'));
    // A fresh build must work without dist/ or any generated Markdown input.
    for (const workflow of WORKFLOWS) {
      for (const resource of workflow.resources ?? []) {
        const path = `skills/${workflow.name}/${resource}`;
        mkdirSync(dirname(join(fixture, path)), { recursive: true });
        cpSync(join(source, path), join(fixture, path));
      }
    }
    symlinkSync(join(source, 'node_modules'), join(fixture, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    npm(fixture, 'run', 'typecheck');
    npm(fixture, 'run', 'build');
    const skillPath = (name: string) => join(fixture, 'skills', name, 'SKILL.md');
    // The fast export checks cover committed content; this test exercises build
    // regeneration and the actual tarball, independently of source Markdown.
    const mtimes = WORKFLOWS.map(workflow => statSync(skillPath(workflow.name)).mtimeMs);
    // Invoking from elsewhere must still use package-relative paths.
    execFileSync(process.execPath, [join(fixture, 'tools/build-workflow-skills.mjs')], { cwd: temp });
    expect(WORKFLOWS.map(workflow => statSync(skillPath(workflow.name)).mtimeMs)).toEqual(mtimes);

    const [packed] = JSON.parse(npm(fixture, 'pack', '--json', '--ignore-scripts', '--pack-destination', temp));
    expect(packed.files.some((file: { path: string }) => file.path.endsWith('/SKILL.md'))).toBe(false);
    const consumer = join(temp, 'consumer');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, dependencies: {
      'adr-kit': `file:${join(temp, packed.filename)}`,
      yaml: `file:${join(source, 'node_modules/yaml')}`,
    } }));
    npm(consumer, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false');
    const cli = join(consumer, 'node_modules/adr-kit/bin/adrkit.js');
    const run = (cwd: string, ...args: string[]) => execFileSync(process.execPath, [cli, ...args], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const standingOrders = '# User-owned instructions\n';
    writeFileSync(join(consumer, 'AGENTS.md'), standingOrders);
    run(consumer, 'init', '--tools', 'claude');
    for (const target of ['.agents', '.claude']) {
      expect(readdirSync(join(consumer, target, 'skills')).sort()).toEqual(WORKFLOWS.map(w => w.name).sort());
      for (const workflow of WORKFLOWS) {
        const skill = join(consumer, target, 'skills', workflow.name, 'SKILL.md');
        expect(readFileSync(skill, 'utf8')).toBe(readFileSync(skillPath(workflow.name), 'utf8'));
        const command = readFileSync(join(consumer, target, 'commands', `${workflow.name}.md`), 'utf8');
        expect(command).toContain(`description: ${workflow.description}`);
        for (const resource of workflow.resources ?? []) {
          expect(readFileSync(join(dirname(skill), resource), 'utf8')).toBe(
            readFileSync(join(fixture, 'skills', workflow.name, resource), 'utf8'),
          );
          expect(command).toContain(`](../skills/${workflow.name}/${resource})`);
        }
        writeFileSync(skill, 'local installed edit');
      }
    }
    rmSync(join(consumer, 'adr/config.yaml'));
    run(consumer, 'init', '--tools', 'claude');
    expect(readFileSync(join(consumer, '.agents/skills/adrkit-note/SKILL.md'), 'utf8')).toBe('local installed edit');
    run(consumer, 'update');
    for (const target of ['.agents', '.claude']) {
      for (const workflow of WORKFLOWS) {
        expect(readFileSync(join(consumer, target, 'skills', workflow.name, 'SKILL.md'), 'utf8'))
          .toBe(readFileSync(skillPath(workflow.name), 'utf8'));
      }
    }
    expect(run(consumer, 'update')).not.toContain('rewrote ');
    expect(readFileSync(join(consumer, 'AGENTS.md'), 'utf8')).toBe(standingOrders);
    const subset = join(temp, 'subset');
    mkdirSync(subset);
    run(subset, 'init', '--tools', 'claude', '--workflows', 'note,visualize');
    run(subset, 'update');
    for (const target of ['.agents', '.claude']) {
      expect(readdirSync(join(subset, target, 'skills')).sort()).toEqual(['adrkit-note', 'adrkit-visualize']);
    }

    // One canonical edit updates an export; one new entry creates its skill.
    const templates = join(fixture, 'src/core/tool-integrations.ts');
    writeFileSync(templates, readFileSync(templates, 'utf8')
      .replace('# ADR Kit Note\n', '# ADR Kit Note\n\nBuild probe.\n')
      .replace('export const WORKFLOWS: Workflow[] = [',
        'export const WORKFLOWS: Workflow[] = [\n  { name: "adrkit-build-probe", description: "Build probe.", body: "# Build probe" },'));
    writeFileSync(skillPath('adrkit-note'), 'edited generated output');
    npm(fixture, 'run', 'build');
    expect(readFileSync(skillPath('adrkit-note'), 'utf8')).toContain('# ADR Kit Note\n\nBuild probe.');
    expect(readFileSync(skillPath('adrkit-build-probe'), 'utf8')).toBe(
      '---\nname: adrkit-build-probe\ndescription: Build probe.\n---\n\n# Build probe\n',
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}, 60_000);
