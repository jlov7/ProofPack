import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import { generatePack, evaluateAll, canonicalizeString } from '@proofpack/core';
import type { PackContents } from '@proofpack/core';
import { demoKeypair } from '../demo/keypair.js';
import { demoPolicy, demoPolicyYaml } from '../demo/policy.js';
import { makeDemoEvents, DEMO_RUN_ID } from '../demo/events.js';

function writePack(dir: string, pack: PackContents): void {
  // Create directory structure
  fs.mkdirSync(path.join(dir, 'events'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'policy'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'audit', 'inclusion_proofs'), { recursive: true });

  // Write raw byte files (must match exactly for hash verification)
  fs.writeFileSync(path.join(dir, 'manifest.json'), pack.raw.manifest);
  fs.writeFileSync(path.join(dir, 'receipt.json'), pack.raw.receipt);
  fs.writeFileSync(path.join(dir, 'events', 'events.jsonl'), pack.raw.events);
  fs.writeFileSync(path.join(dir, 'policy', 'policy.yml'), pack.raw.policy);
  fs.writeFileSync(path.join(dir, 'policy', 'decisions.jsonl'), pack.raw.decisions);
  fs.writeFileSync(path.join(dir, 'audit', 'merkle.json'), pack.raw.merkle);

  // Write inclusion proofs (per-event JSON files)
  for (const proof of pack.inclusionProofs) {
    const proofPath = path.join(dir, 'audit', 'inclusion_proofs', `${proof.event_id}.json`);
    fs.writeFileSync(proofPath, canonicalizeString(proof) + '\n');
  }
}

export function runDemo(outputDir?: string): void {
  const dir = outputDir ?? path.resolve('examples', 'sample_runs', 'latest.proofpack');

  console.error(chalk.bold('ProofPack Demo Generator'));
  console.error(chalk.dim('─'.repeat(40)));

  // Generate demo events
  const events = makeDemoEvents();
  console.error(`Generating ${chalk.cyan(String(events.length))} demo events...`);

  // Evaluate policy decisions
  const decisions = evaluateAll(events, demoPolicy);
  const allows = decisions.filter((d) => d.decision === 'allow').length;
  const denies = decisions.filter((d) => d.decision === 'deny').length;
  const holds = decisions.filter((d) => d.decision === 'hold').length;
  console.error(
    `Policy decisions: ${chalk.green(`${allows} allow`)}, ${chalk.red(`${denies} deny`)}, ${chalk.yellow(`${holds} hold`)}`,
  );

  // Generate the pack
  const pack = generatePack({
    runId: DEMO_RUN_ID,
    createdAt: '2026-01-15T10:00:00.000Z',
    producerName: 'proofpack-demo',
    producerVersion: '0.1.0',
    events,
    policy: demoPolicy,
    policyYaml: demoPolicyYaml,
    decisions,
    keypair: demoKeypair,
  });
  console.error('Building Merkle tree & signing receipt...');

  // Write to disk
  writePack(dir, pack);
  console.error(`\nWritten to ${chalk.cyan(dir)}`);
  console.error(`  ${chalk.green('✓')} manifest.json`);
  console.error(`  ${chalk.green('✓')} receipt.json`);
  console.error(`  ${chalk.green('✓')} events/events.jsonl (${events.length} events)`);
  console.error(`  ${chalk.green('✓')} policy/policy.yml`);
  console.error(`  ${chalk.green('✓')} policy/decisions.jsonl (${decisions.length} decisions)`);
  console.error(`  ${chalk.green('✓')} audit/merkle.json`);
  console.error(
    `  ${chalk.green('✓')} audit/inclusion_proofs/ (${pack.inclusionProofs.length} proofs)`,
  );

  console.error('\n' + chalk.dim('─'.repeat(40)));
  console.error(`${chalk.green('Done!')} Verify with:`);
  console.error(`  pnpm verify -- ${dir}`);
}

// Run as standalone script (when executed directly, not imported)
const isMain = process.argv[1]?.endsWith('commands/demo.js');
if (isMain) {
  runDemo(process.argv[2]);
}
