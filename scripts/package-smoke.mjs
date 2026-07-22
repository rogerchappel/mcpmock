import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packageName = '@rogerchappel/mcpmock';
const smokeRoot = mkdtempSync(join(tmpdir(), 'mcpmock-package-smoke-'));

try {
  const output = execFileSync(
    'npm',
    ['pack', '--json', '--pack-destination', smokeRoot],
    { encoding: 'utf8' },
  );
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
    process.exitCode = 1;
    throw new Error('package contents are incomplete');
  }

  if (pack.name !== packageName) {
    throw new Error(`Package smoke failed; packed ${pack.name}, expected ${packageName}.`);
  }

  const cliFirstLine = readFileSync('dist/cli.js', 'utf8').split(/\r?\n/, 1)[0];
  if (cliFirstLine !== '#!/usr/bin/env node') {
    throw new Error('Package smoke failed; dist/cli.js must start with a node shebang.');
  }

  const installRoot = join(smokeRoot, 'install');
  const tarball = join(smokeRoot, pack.filename);
  execFileSync(
    'npm',
    [
      'install',
      '--prefix',
      installRoot,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      tarball,
    ],
    { stdio: 'pipe' },
  );

  const installedPackage = JSON.parse(
    readFileSync(join(installRoot, 'node_modules', ...packageName.split('/'), 'package.json'), 'utf8'),
  );
  if (installedPackage.name !== packageName) {
    throw new Error(`Package smoke failed; installed ${installedPackage.name}, expected ${packageName}.`);
  }

  const helpOutput = execFileSync(join(installRoot, 'node_modules', '.bin', 'mcpmock'), ['--help'], {
    encoding: 'utf8',
  });
  const expectedHelp = [
    'Usage: mcpmock [options] [command]',
    'Fixture-backed mock MCP tool catalogs for deterministic agent testing',
    'validate [options] <catalog>',
  ];
  const missingHelp = expectedHelp.filter((text) => !helpOutput.includes(text));
  if (missingHelp.length > 0) {
    throw new Error(`Package smoke failed; installed CLI help is missing: ${missingHelp.join(', ')}`);
  }

  console.log(
    `Package smoke OK: installed ${pack.name}@${pack.version} with ${pack.files.length} files and verified mcpmock --help.`,
  );
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}
