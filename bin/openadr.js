#!/usr/bin/env node
import('../dist/cli.js').then(({ main }) => main(process.argv.slice(2))).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
