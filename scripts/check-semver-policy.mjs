import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageFiles = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/core/package.json',
  'packages/cli/package.json',
];

const semverRegex = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const errors = [];

for (const relPath of packageFiles) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing package file: ${relPath}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (!semverRegex.test(data.version ?? '')) {
    errors.push(`${relPath}: invalid semver version "${data.version}"`);
  }

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const deps = data[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const [dep, version] of Object.entries(deps)) {
      if (dep.startsWith('@proofpack/') && version !== 'workspace:*') {
        errors.push(
          `${relPath}: internal dependency ${dep} must use "workspace:*" but found "${version}"`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Semver policy check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.warn(`Semver policy passed for ${packageFiles.length} package manifests.`);
