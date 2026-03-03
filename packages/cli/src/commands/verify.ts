import chalk from 'chalk';
import fs from 'node:fs';
import {
  loadPackFromDirectory,
  verifyPack,
  TrustStoreSchema,
  type VerificationReport,
  type VerificationCheck,
  type VerificationProfile,
  type TrustStore,
} from '@proofpack/core';

export interface VerifyCommandOptions {
  json?: boolean;
  profile?: VerificationProfile;
  trustStorePath?: string;
  requireTrustedKey?: boolean;
  requireTimestampAnchor?: boolean;
}

function loadTrustStore(trustStorePath: string): TrustStore {
  const raw = fs.readFileSync(trustStorePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  return TrustStoreSchema.parse(parsed);
}

function checkDescription(c: VerificationCheck): string {
  switch (c.name) {
    case 'manifest.schema':
      return 'Schema valid';
    case 'receipt.signature': {
      const valid = c.details.valid_signatures ?? '?';
      const threshold = c.details.threshold ?? '?';
      return `Ed25519 verified (${valid}/${threshold} signatures)`;
    }
    case 'receipt.trust': {
      const keys = (c.details.trusted_keys as string[] | undefined) ?? [];
      return keys.length > 0 ? `Trusted keys: ${keys.join(', ')}` : 'Trust decision passed';
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
    case 'timestamp.anchor': {
      const ts = c.details.timestamp ?? '?';
      return `Timestamp anchored (${ts})`;
    }
    case 'history.consistency': {
      const size = c.details.previous_tree_size ?? '?';
      return `Append-only history verified (prefix: ${size} events)`;
    }
    default:
      return c.name;
  }
}

function printReport(report: VerificationReport): void {
  console.error(chalk.bold('\nProofPack Verification Report'));
  console.error(chalk.dim('─'.repeat(40)));
  console.error(`Profile:    ${report.profile}`);
  console.error(`Run ID:     ${chalk.cyan(report.run_id)}`);
  console.error(`Created:    ${report.created_at}`);
  console.error(`Producer:   ${report.producer.name} v${report.producer.version}`);
  console.error('');

  let passed = 0;
  for (const c of report.checks) {
    const icon = c.ok ? chalk.green('✓') : chalk.red('✗');
    const name = c.name.padEnd(24);
    const desc = c.ok
      ? checkDescription(c)
      : chalk.red(
          [c.error ?? 'Failed', c.hint ? `Hint: ${c.hint}` : undefined].filter(Boolean).join('  '),
        );
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

function printJsonReport(report: VerificationReport): void {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

export function runVerify(packPath: string, opts: VerifyCommandOptions = {}): void {
  try {
    const pack = loadPackFromDirectory(packPath);
    const trustStore = opts.trustStorePath ? loadTrustStore(opts.trustStorePath) : undefined;
    const report = verifyPack(pack, {
      profile: opts.profile,
      trustStore,
      requireTrustedKey: opts.requireTrustedKey,
      requireTimestampAnchor: opts.requireTimestampAnchor,
    });
    if (opts?.json) {
      printJsonReport(report);
    } else {
      printReport(report);
    }
    process.exitCode = report.verified ? 0 : 1;
  } catch (err) {
    if (opts?.json) {
      process.stdout.write(
        JSON.stringify(
          {
            verified: false,
            error: err instanceof Error ? err.message : String(err),
          },
          null,
          2,
        ) + '\n',
      );
    } else {
      console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : String(err)}`));
    }
    process.exitCode = 2;
  }
}
