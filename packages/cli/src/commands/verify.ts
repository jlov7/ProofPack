import chalk from 'chalk';
import { loadPackFromDirectory, verifyPack } from '@proofpack/core';
import type { VerificationReport, VerificationCheck } from '@proofpack/core';

function checkDescription(c: VerificationCheck): string {
  switch (c.name) {
    case 'manifest.schema':
      return 'Schema valid';
    case 'receipt.signature': {
      const key = (c.details.public_key as string | undefined) ?? '';
      return `Ed25519 verified (key: ${key.slice(0, 8)}...)`;
    }
    case 'merkle.root': {
      const size = c.details.tree_size ?? '?';
      return `Root matches (${size} events)`;
    }
    case 'merkle.inclusion_all': {
      const verified = c.details.verified_events ?? '?';
      return `All ${verified} proofs valid`;
    }
    case 'policy.hash':
      return 'Hashes match';
    case 'disclosure.openings': {
      if (c.details.skipped) return 'No openings (private pack)';
      return `${c.details.openings} openings verified`;
    }
    default:
      return c.name;
  }
}

function printReport(report: VerificationReport): void {
  console.error(chalk.bold('\nProofPack Verification Report'));
  console.error(chalk.dim('─'.repeat(40)));
  console.error(`Run ID:     ${chalk.cyan(report.run_id)}`);
  console.error(`Created:    ${report.created_at}`);
  console.error(`Producer:   ${report.producer.name} v${report.producer.version}`);
  console.error('');

  let passed = 0;
  for (const c of report.checks) {
    const icon = c.ok ? chalk.green('✓') : chalk.red('✗');
    const name = c.name.padEnd(24);
    const desc = c.ok ? checkDescription(c) : chalk.red(c.error ?? 'Failed');
    console.error(`  ${icon}  ${name} ${desc}`);
    if (c.ok) passed++;
  }

  console.error('');
  if (report.verified) {
    console.error(chalk.green.bold(`VERIFIED (${passed}/${report.checks.length} checks passed)`));
  } else {
    console.error(chalk.red.bold(`NOT VERIFIED (${passed}/${report.checks.length} checks passed)`));
  }

  // Events summary
  if (report.events_preview.length > 0) {
    console.error(chalk.dim(`\n${report.events_preview.length} events in log`));
  }
}

export function runVerify(packPath: string): void {
  try {
    const pack = loadPackFromDirectory(packPath);
    const report = verifyPack(pack);
    printReport(report);
    process.exitCode = report.verified ? 0 : 1;
  } catch (err) {
    console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : String(err)}`));
    process.exitCode = 2;
  }
}
