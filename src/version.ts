import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The version comes from package.json, which is the single source of truth
 * (changesets bump it on every release). A hardcoded constant here would
 * drift from the published version and make `adrkit --version` lie.
 */
const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };

export const VERSION = packageJson.version;
