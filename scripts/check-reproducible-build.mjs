#!/usr/bin/env node
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  'packages/core/dist',
  'packages/cli/dist',
  'apps/api/dist',
  'apps/web/.next/BUILD_ID',
];

function run(cmd) {
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PROOFPACK_BUILD_ID: process.env.PROOFPACK_BUILD_ID ?? 'proofpack-repro-build',
    },
  });
}

function walkFiles(absPath) {
  const stats = fs.statSync(absPath);
  if (stats.isFile()) return [absPath];
  const entries = fs.readdirSync(absPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(absPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(child));
    } else {
      files.push(child);
    }
  }
  return files;
}

function snapshot() {
  const lines = [];
  for (const relativeTarget of targets) {
    const absTarget = path.join(root, relativeTarget);
    if (!fs.existsSync(absTarget)) {
      throw new Error(`Missing build target: ${relativeTarget}`);
    }
    const files = walkFiles(absTarget).sort();
    for (const file of files) {
      const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      lines.push(`${digest}  ${path.relative(root, file)}`);
    }
  }
  return lines.join('\n') + '\n';
}

function cleanBuildOutputs() {
  fs.rmSync(path.join(root, 'packages/core/dist'), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'packages/cli/dist'), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'apps/api/dist'), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'apps/web/.next'), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'packages/core/tsconfig.tsbuildinfo'), { force: true });
  fs.rmSync(path.join(root, 'packages/cli/tsconfig.tsbuildinfo'), { force: true });
  fs.rmSync(path.join(root, 'apps/api/tsconfig.tsbuildinfo'), { force: true });
}

cleanBuildOutputs();
run('pnpm build');
const first = snapshot();

cleanBuildOutputs();
run('pnpm build');
const second = snapshot();

if (first !== second) {
  const outDir = path.join(root, 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'repro-first.txt'), first);
  fs.writeFileSync(path.join(outDir, 'repro-second.txt'), second);
  throw new Error(
    'Build outputs are not reproducible. Compare artifacts/repro-first.txt and artifacts/repro-second.txt',
  );
}

process.stdout.write('Reproducible build check passed.\n');
