#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const releaseDir = path.join(root, 'artifacts', 'release');
const sumsPath = path.join(releaseDir, 'SHA256SUMS');
const sigPath = path.join(releaseDir, 'SHA256SUMS.sig');
const pubKeyPath = path.join(releaseDir, 'SHA256SUMS.public.pem');
const attestationPath = path.join(releaseDir, 'attestation.json');

function listFilesRecursive(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(abs));
      continue;
    }
    const rel = path.relative(releaseDir, abs);
    if (rel === 'SHA256SUMS' || rel === 'SHA256SUMS.sig' || rel === 'SHA256SUMS.public.pem') {
      continue;
    }
    results.push(abs);
  }
  return results.sort();
}

function buildSums() {
  const files = listFilesRecursive(releaseDir);
  if (files.length === 0) {
    throw new Error('No release artifacts found in artifacts/release');
  }
  const lines = files.map((absPath) => {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
    const rel = path.relative(releaseDir, absPath);
    return `${digest}  ${rel}`;
  });
  const content = lines.join('\n') + '\n';
  fs.writeFileSync(sumsPath, content);
  return content;
}

function resolveSigningKey() {
  const keyPath = process.env.PROOFPACK_RELEASE_PRIVATE_KEY_PATH;
  const keyPem = process.env.PROOFPACK_RELEASE_PRIVATE_KEY_PEM;
  if (keyPath) {
    return {
      privateKey: crypto.createPrivateKey(fs.readFileSync(path.resolve(keyPath), 'utf-8')),
      source: `path:${keyPath}`,
    };
  }
  if (keyPem) {
    return {
      privateKey: crypto.createPrivateKey(keyPem),
      source: 'env:PROOFPACK_RELEASE_PRIVATE_KEY_PEM',
    };
  }
  const generated = crypto.generateKeyPairSync('ed25519');
  return {
    privateKey: generated.privateKey,
    source: 'generated-ephemeral',
  };
}

if (!fs.existsSync(releaseDir)) {
  throw new Error('Missing artifacts/release directory. Run pnpm release:artifacts first.');
}

const sumsContent = buildSums();
const { privateKey, source } = resolveSigningKey();
const publicKey = crypto.createPublicKey(privateKey);
const signature = crypto.sign(null, Buffer.from(sumsContent, 'utf-8'), privateKey);

fs.writeFileSync(sigPath, signature.toString('base64') + '\n');
fs.writeFileSync(pubKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));
fs.writeFileSync(
  attestationPath,
  JSON.stringify(
    {
      algorithm: 'ed25519',
      signed_at: new Date().toISOString(),
      key_source: source,
      files_signed: listFilesRecursive(releaseDir)
        .map((absPath) => path.relative(releaseDir, absPath))
        .filter((name) => !name.startsWith('SHA256SUMS')),
    },
    null,
    2,
  ) + '\n',
);

process.stdout.write(`Signed release artifacts: ${sigPath}\n`);
process.stdout.write(`Public key written to: ${pubKeyPath}\n`);
