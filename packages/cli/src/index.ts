#!/usr/bin/env node
import { Command } from 'commander';
import { runVerify } from './commands/verify.js';
import { runDemo } from './commands/demo.js';

const program = new Command();

program
  .name('proofpack')
  .version('0.1.0')
  .description('Verifiable receipt system for AI agent runs');

program
  .command('verify')
  .description('Verify a ProofPack directory')
  .argument('<path>', 'Path to .proofpack directory')
  .action((packPath: string) => {
    runVerify(packPath);
  });

program
  .command('demo')
  .description('Generate a demo ProofPack')
  .option('-o, --output <dir>', 'Output directory', 'examples/sample_runs/latest.proofpack')
  .action((opts: { output: string }) => {
    runDemo(opts.output);
  });

program.parse();
