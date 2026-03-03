#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'artifacts', 'release');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function archive(targetPath, sourceDir, includePaths) {
  const includes = includePaths.map((p) => `"${p}"`).join(' ');
  run(`tar -czf "${targetPath}" -C "${sourceDir}" ${includes}`);
}

ensureCleanDir(outDir);
run('pnpm build');

archive(path.join(outDir, 'proofpack-core-dist.tgz'), path.join(root, 'packages', 'core'), [
  'dist',
  'package.json',
]);
archive(path.join(outDir, 'proofpack-cli-dist.tgz'), path.join(root, 'packages', 'cli'), [
  'dist',
  'package.json',
]);
archive(path.join(outDir, 'proofpack-api-dist.tgz'), path.join(root, 'apps', 'api'), [
  'dist',
  'package.json',
]);
archive(path.join(outDir, 'proofpack-web-build.tgz'), path.join(root, 'apps', 'web'), [
  '.next',
  'package.json',
  'next.config.ts',
]);

process.stdout.write(`Release artifacts built in ${outDir}\n`);
