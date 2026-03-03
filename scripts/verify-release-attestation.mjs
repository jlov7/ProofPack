#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const releaseDir = path.join(root, 'artifacts', 'release');
const sumsPath = path.join(releaseDir, 'SHA256SUMS');
const sigPath = path.join(releaseDir, 'SHA256SUMS.sig');
const pubKeyPath = process.env.PROOFPACK_RELEASE_PUBLIC_KEY_PATH
  ? path.resolve(process.env.PROOFPACK_RELEASE_PUBLIC_KEY_PATH)
  : path.join(releaseDir, 'SHA256SUMS.public.pem');

function computeSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

if (!fs.existsSync(sumsPath) || !fs.existsSync(sigPath) || !fs.existsSync(pubKeyPath)) {
  throw new Error('Missing SHA256SUMS, SHA256SUMS.sig, or public key file.');
}

const sums = fs.readFileSync(sumsPath, 'utf-8').trim().split('\n').filter(Boolean);
for (const line of sums) {
  const [expectedHash, relPath] = line.split(/\s{2,}/);
  if (!expectedHash || !relPath) {
    throw new Error(`Invalid SHA256SUMS line: ${line}`);
  }
  const absolutePath = path.join(releaseDir, relPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing artifact referenced by SHA256SUMS: ${relPath}`);
  }
  const actualHash = computeSha256(absolutePath);
  if (actualHash !== expectedHash) {
    throw new Error(`Hash mismatch for ${relPath}: expected=${expectedHash} actual=${actualHash}`);
  }
}

const signature = Buffer.from(fs.readFileSync(sigPath, 'utf-8').trim(), 'base64');
const publicKey = crypto.createPublicKey(fs.readFileSync(pubKeyPath, 'utf-8'));
const verified = crypto.verify(
  null,
  Buffer.from(fs.readFileSync(sumsPath, 'utf-8')),
  publicKey,
  signature,
);

if (!verified) {
  throw new Error('Attestation signature verification failed');
}

process.stdout.write('Release attestation verified successfully.\n');
