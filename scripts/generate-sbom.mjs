import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('artifacts', { recursive: true });

const env = {
  PATH: process.env.PATH ?? '',
  HOME: process.env.HOME ?? '',
  USER: process.env.USER ?? '',
  TMPDIR: process.env.TMPDIR ?? '/tmp',
  CI: process.env.CI ?? '',
};

const result = spawnSync(
  'npx',
  ['--yes', '@cyclonedx/cdxgen', '-r', '-o', './artifacts/sbom.cdx.json'],
  {
    stdio: 'inherit',
    env,
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
