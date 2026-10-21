import { readFileSync, statSync, type Stats } from 'node:fs';

function pathKind(info: Stats): string {
  if (info.isDirectory()) return 'directory';
  if (info.isFIFO()) return 'fifo';
  if (info.isSocket()) return 'socket';
  if (info.isCharacterDevice()) return 'character device';
  if (info.isBlockDevice()) return 'block device';
  return 'special file';
}

/** Follow links to regular files, but reject devices and FIFOs before reading. */
export function readRegularText(path: string, label: string): string {
  let info: Stats;
  try {
    info = statSync(path);
  } catch (error) {
    throw new Error(`${label} path cannot be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!info.isFile()) {
    throw new Error(`${label} path is not a regular file (${pathKind(info)})`);
  }
  return readFileSync(path, 'utf8');
}
