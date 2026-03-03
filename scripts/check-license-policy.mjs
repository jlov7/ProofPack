import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, 'config', 'license-allowlist.json');

if (!fs.existsSync(configPath)) {
  console.error(`Missing license allowlist file: ${configPath}`);
  process.exit(1);
}

const configRaw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configRaw);
const allowedLicenses = new Set(config.allowed_licenses ?? []);
const allowedUnknownPackages = new Set(config.allowed_unknown_license_packages ?? []);

if (allowedLicenses.size === 0) {
  console.error('License allowlist is empty; refusing to pass policy check.');
  process.exit(1);
}

const output = execSync('pnpm licenses list --json', {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const byLicense = JSON.parse(output);
const discoveredLicenses = Object.keys(byLicense);
const disallowed = discoveredLicenses.filter(
  (license) => license !== 'Unknown' && !allowedLicenses.has(license),
);

if (disallowed.length > 0) {
  console.error('Dependency license policy violation.');
  console.error(`Disallowed licenses: ${disallowed.sort().join(', ')}`);
  process.exit(1);
}

const unknownPackages = (byLicense.Unknown ?? []).map((pkg) => pkg.name);
const unapprovedUnknowns = unknownPackages.filter((name) => !allowedUnknownPackages.has(name));
if (unapprovedUnknowns.length > 0) {
  console.error('Dependency license policy violation.');
  console.error(`Unknown-license packages are not approved: ${unapprovedUnknowns.join(', ')}`);
  process.exit(1);
}

console.warn(
  `License policy passed. ${discoveredLicenses.length} license groups checked, ${unknownPackages.length} unknown-license package(s) explicitly approved.`,
);
