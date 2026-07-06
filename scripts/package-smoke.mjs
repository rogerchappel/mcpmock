import { execFileSync } from 'node:child_process';

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

console.log(`Package smoke OK: ${pack.name}@${pack.version} includes ${pack.files.length} files.`);
