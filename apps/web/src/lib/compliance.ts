import type { VerifyApiResponse } from './store';

export type ComplianceTemplate = 'soc2' | 'iso27001' | 'internal-audit';

function sharedSection(report: VerifyApiResponse): string {
  const failedChecks = report.checks.filter((check) => !check.ok);
  return [
    `Run ID: ${report.summary.run_id}`,
    `Created At: ${report.summary.created_at}`,
    `Producer: ${report.summary.producer.name} v${report.summary.producer.version}`,
    `Verified: ${report.summary.verified ? 'yes' : 'no'}`,
    `Checks Passed: ${report.checks.filter((check) => check.ok).length}/${report.checks.length}`,
    `Failed Checks: ${failedChecks.length > 0 ? failedChecks.map((check) => check.name).join(', ') : 'none'}`,
  ].join('\n');
}

export function buildComplianceTemplate(
  template: ComplianceTemplate,
  report: VerifyApiResponse,
): string {
  switch (template) {
    case 'soc2':
      return `# SOC 2 Evidence Report\n\n## Control Scope\nProofPack verification of AI runtime integrity and policy enforcement.\n\n## Evidence\n${sharedSection(report)}\n\n## Reviewer Checklist\n- Confirm independent re-verification completed\n- Confirm evidence bundle archived per retention policy\n- Confirm exceptions logged in risk register\n`;
    case 'iso27001':
      return `# ISO 27001 Verification Annex\n\n## A.12.4 Logging and Monitoring\nCryptographic verification of AI-run audit records.\n\n## Annex Evidence\n${sharedSection(report)}\n\n## Required Sign-off\n- Security reviewer\n- Compliance reviewer\n- System owner\n`;
    case 'internal-audit':
      return `# Internal Audit Packet\n\n## Objective\nValidate tamper-evidence and policy adherence for AI-assisted runs.\n\n## Verification Snapshot\n${sharedSection(report)}\n\n## Follow-up Actions\n- Record ticket for any failed checks\n- Attach public proofpack and verification JSON to audit record\n- Schedule quarterly re-validation\n`;
    default:
      return sharedSection(report);
  }
}
