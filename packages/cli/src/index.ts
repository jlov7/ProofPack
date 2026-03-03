#!/usr/bin/env node
import { Command } from 'commander';
import { runVerify } from './commands/verify.js';
import { runDemo } from './commands/demo.js';
import { runDiff } from './commands/diff.js';

const program = new Command();

program
  .name('proofpack')
  .version('0.1.0')
  .description('Verifiable receipt system for AI agent runs');

program
  .command('verify')
  .description('Verify a ProofPack directory')
  .argument('<path>', 'Path to .proofpack directory')
  .option('--json', 'Output machine-readable JSON report')
  .option('--profile <profile>', 'Verification policy profile: standard|strict|permissive')
  .option('--trust-store <path>', 'Path to trust-store JSON file')
  .option('--require-trusted-key', 'Fail if receipt key is not trusted')
  .option('--require-timestamp-anchor', 'Fail if timestamp anchor is missing')
  .action(
    (
      packPath: string,
      opts: {
        json?: boolean;
        profile?: 'standard' | 'strict' | 'permissive';
        trustStore?: string;
        requireTrustedKey?: boolean;
        requireTimestampAnchor?: boolean;
      },
    ) => {
      runVerify(packPath, {
        json: opts.json,
        profile: opts.profile,
        trustStorePath: opts.trustStore,
        requireTrustedKey: opts.requireTrustedKey,
        requireTimestampAnchor: opts.requireTimestampAnchor,
      });
    },
  );

program
  .command('diff')
  .description('Compare two ProofPack directories and report deltas')
  .argument('<left>', 'Path to left .proofpack directory')
  .argument('<right>', 'Path to right .proofpack directory')
  .option('--json', 'Output machine-readable JSON diff')
  .action((leftPath: string, rightPath: string, opts: { json?: boolean }) => {
    runDiff(leftPath, rightPath, opts);
  });

program
  .command('demo')
  .description('Generate a demo ProofPack')
  .option('-o, --output <dir>', 'Output directory', 'examples/sample_runs/latest.proofpack')
  .action((opts: { output: string }) => {
    runDemo(opts.output);
  });

program.parse();
