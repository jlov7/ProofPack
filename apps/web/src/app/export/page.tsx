'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePackStore } from '@/lib/store';
import { redactPack as redactPackApi } from '@/lib/api';
import { buildComplianceTemplate, type ComplianceTemplate } from '@/lib/compliance';

function downloadBlob(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const router = useRouter();
  const report = usePackStore((s) => s.report);
  const packZip = usePackStore((s) => s.packZip);
  const [exporting, setExporting] = useState(false);

  if (!report || !report.ok) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-8">
        <p className="text-[var(--text-muted)] mb-4">No pack loaded yet.</p>
        <button
          onClick={() => router.push('/verify')}
          className="text-sm text-[var(--accent-green)] hover:underline"
        >
          Go to Verify
        </button>
      </div>
    );
  }

  const handleExportReport = () => {
    const json = JSON.stringify(report, null, 2);
    downloadBlob(json, 'verification-report.json', 'application/json');
  };

  const handleExportPack = () => {
    if (!packZip) return;
    downloadBlob(packZip, 'proofpack.zip', 'application/zip');
  };

  const handleExportPublic = async () => {
    if (!packZip) return;
    setExporting(true);
    try {
      const blob = new Blob([packZip], { type: 'application/zip' });
      const publicBuffer = await redactPackApi(blob);
      downloadBlob(publicBuffer, 'public.proofpack.zip', 'application/zip');
    } catch {
      // User can try again
    } finally {
      setExporting(false);
    }
  };

  const handleExportCompliance = (template: ComplianceTemplate) => {
    const content = buildComplianceTemplate(template, report);
    downloadBlob(content, `${template}-compliance-report.md`, 'text/markdown');
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Export</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Download verification reports and pack files
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Verification Report */}
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Verification Report</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              JSON report with all check results, event summaries, and run metadata
            </p>
          </div>
          <button
            onClick={handleExportReport}
            className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors whitespace-nowrap"
          >
            Download JSON
          </button>
        </div>

        {/* Original Pack */}
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Original Pack</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Full ProofPack zip with all events, payloads, proofs, and policy
            </p>
            <p className="text-[10px] text-amber-400 mt-1">Contains sensitive data</p>
          </div>
          <button
            onClick={handleExportPack}
            disabled={!packZip}
            className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Download Zip
          </button>
        </div>

        {/* Public Pack */}
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Public Pack</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Redacted pack with payloads replaced by commitments. Safe to share publicly.
            </p>
            <p className="text-[10px] text-emerald-400 mt-1">Re-signed, independently verifiable</p>
          </div>
          <button
            onClick={handleExportPublic}
            disabled={!packZip || exporting}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--accent-green)] text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            {exporting ? 'Generating...' : 'Export Public'}
          </button>
        </div>
      </div>

      {/* Evidence bundle */}
      <div className="p-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]">
        <h3 className="text-sm font-medium text-[var(--text-muted)]">Evidence Bundle</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Combine the verification report with the public pack for a complete evidence package. The
          report proves verification was performed, and the public pack allows independent
          re-verification.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
        <h3 className="text-sm font-medium">Compliance Templates</h3>
        <p className="text-xs text-[var(--text-muted)]">
          Generate pre-filled markdown templates for common audit frameworks.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExportCompliance('soc2')}
            className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            SOC 2
          </button>
          <button
            onClick={() => handleExportCompliance('iso27001')}
            className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            ISO 27001
          </button>
          <button
            onClick={() => handleExportCompliance('internal-audit')}
            className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Internal Audit
          </button>
        </div>
      </div>
    </div>
  );
}
