import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
});
const [pack] = JSON.parse(output);
const files = new Set(pack.files.map((file) => file.path));
const required = [
  'dist/cli.js',
  'dist/index.js',
  'dist/index.d.ts',
  'fixtures/catalog.json',
  'fixtures/minimal.json',
  'fixtures/invalid.json',
  'docs/README.md',
  'README.md',
  'SKILL.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md',
];

const missing = required.filter((file) => !files.has(file));
if (missing.length > 0) {
  console.error('Package smoke failed; missing expected release-candidate files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const cliFirstLine = readFileSync('dist/cli.js', 'utf8').split(/\r?\n/, 1)[0];
if (cliFirstLine !== '#!/usr/bin/env node') {
  console.error('Package smoke failed; dist/cli.js must start with a node shebang.');
  process.exit(1);
}

const helpOutput = execFileSync('./dist/cli.js', ['--help'], { encoding: 'utf8' });
if (!helpOutput.includes('Usage: mcpmock')) {
  console.error('Package smoke failed; dist CLI help did not print usage text.');
  process.exit(1);
}

console.log(`Package smoke OK: ${pack.name}@${pack.version} includes ${pack.files.length} files.`);
