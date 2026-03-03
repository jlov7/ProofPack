import chalk from 'chalk';
import { loadPackFromDirectory, diffPacks, type PackDiffReport } from '@proofpack/core';

function printHuman(report: PackDiffReport): void {
  console.error(chalk.bold('\nProofPack Diff Report'));
  console.error(chalk.dim('─'.repeat(40)));
  console.error(`Identical:  ${report.identical ? chalk.green('yes') : chalk.yellow('no')}`);
  console.error(`Run IDs:    ${report.run.left_run_id} vs ${report.run.right_run_id}`);
  console.error(`Created At: ${report.created_at.left} vs ${report.created_at.right}`);
  console.error(
    `Events:     ${report.event_counts.left} -> ${report.event_counts.right} (delta ${report.event_counts.delta})`,
  );
  console.error(
    `Hashes:     policy=${report.hashes.policy_same} decisions=${report.hashes.decisions_same} merkle=${report.hashes.merkle_same}`,
  );
  if (
    report.events.added.length > 0 ||
    report.events.removed.length > 0 ||
    report.events.changed.length > 0
  ) {
    console.error('');
    if (report.events.added.length > 0) {
      console.error(`Added (${report.events.added.length}): ${report.events.added.join(', ')}`);
    }
    if (report.events.removed.length > 0) {
      console.error(
        `Removed (${report.events.removed.length}): ${report.events.removed.join(', ')}`,
      );
    }
    if (report.events.changed.length > 0) {
      console.error(
        `Changed (${report.events.changed.length}): ${report.events.changed.join(', ')}`,
      );
    }
  }
}

export function runDiff(leftPath: string, rightPath: string, opts?: { json?: boolean }): void {
  try {
    const left = loadPackFromDirectory(leftPath);
    const right = loadPackFromDirectory(rightPath);
    const report = diffPacks(left, right);

    if (opts?.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } else {
      printHuman(report);
    }
    process.exitCode = 0;
  } catch (err) {
    if (opts?.json) {
      process.stdout.write(
        JSON.stringify(
          {
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
