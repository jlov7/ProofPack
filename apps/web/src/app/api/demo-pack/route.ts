import { NextResponse } from 'next/server';
import { generatePack, evaluateAll, keypairFromSeed, canonicalizeString } from '@proofpack/core';
import type { Event, Policy } from '@proofpack/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const seed = new Uint8Array(32);
seed[0] = 0xde;
seed[1] = 0xad;
seed[2] = 0xbe;
seed[3] = 0xef;
const demoKeypair = keypairFromSeed(seed);

const DEMO_RUN_ID = 'd3e0baa5-de10-4000-a000-000000000000';

const demoPolicy: Policy = {
  version: '0.1',
  defaults: { decision: 'deny' },
  rules: [
    {
      id: 'allow_read_workspace',
      when: { event_type: 'fs.read', path_glob: 'workspace/**' },
      decision: 'allow',
      severity: 'low',
      reason: 'Allow reading files inside workspace',
    },
    {
      id: 'allow_tool_list_dir',
      when: { event_type: 'tool.call', tool: 'list_dir' },
      decision: 'allow',
      severity: 'low',
      reason: 'Allow list_dir tool',
    },
    {
      id: 'hold_shell_exec',
      when: { event_type: 'shell.exec' },
      decision: 'hold',
      severity: 'medium',
      reason: 'Shell commands require human approval',
    },
    {
      id: 'deny_network',
      when: { event_type: 'net.http' },
      decision: 'deny',
      severity: 'high',
      reason: 'Network access is not allowed',
    },
    {
      id: 'allow_write_out',
      when: { event_type: 'fs.write', path_glob: 'workspace/out/**' },
      decision: 'allow',
      severity: 'low',
      reason: 'Allow writing to output directory',
    },
  ],
};

const demoPolicyYaml = `version: "0.1"
defaults:
  decision: deny
rules:
  - id: allow_read_workspace
    when:
      event_type: fs.read
      path_glob: "workspace/**"
    decision: allow
    severity: low
    reason: "Allow reading files inside workspace"
  - id: allow_tool_list_dir
    when:
      event_type: tool.call
      tool: list_dir
    decision: allow
    severity: low
    reason: "Allow list_dir tool"
  - id: hold_shell_exec
    when:
      event_type: shell.exec
    decision: hold
    severity: medium
    reason: "Shell commands require human approval"
  - id: deny_network
    when:
      event_type: net.http
    decision: deny
    severity: high
    reason: "Network access is not allowed"
  - id: allow_write_out
    when:
      event_type: fs.write
      path_glob: "workspace/out/**"
    decision: allow
    severity: low
    reason: "Allow writing to output directory"
`;

function makeDemoEvents(): Event[] {
  return [
    {
      event_id: 'd3e0baa5-0001-4000-a000-000000000001',
      ts: '2026-01-15T10:00:00.000Z',
      type: 'run.start',
      actor: 'proofpack-demo-agent',
      payload: { model: 'gpt-4o', session: 'demo-session-01' },
    },
    {
      event_id: 'd3e0baa5-0002-4000-a000-000000000002',
      ts: '2026-01-15T10:00:01.000Z',
      type: 'fs.read',
      actor: 'proofpack-demo-agent',
      payload: { path: 'workspace/config.json' },
    },
    {
      event_id: 'd3e0baa5-0003-4000-a000-000000000003',
      ts: '2026-01-15T10:00:02.000Z',
      type: 'fs.read',
      actor: 'proofpack-demo-agent',
      payload: { path: 'workspace/src/index.ts' },
    },
    {
      event_id: 'd3e0baa5-0004-4000-a000-000000000004',
      ts: '2026-01-15T10:00:03.000Z',
      type: 'fs.read',
      actor: 'proofpack-demo-agent',
      payload: { path: 'workspace/../secrets.env' },
    },
    {
      event_id: 'd3e0baa5-0005-4000-a000-000000000005',
      ts: '2026-01-15T10:00:05.000Z',
      type: 'tool.call',
      actor: 'proofpack-demo-agent',
      payload: { tool: 'list_dir', path: 'workspace/' },
    },
    {
      event_id: 'd3e0baa5-0006-4000-a000-000000000006',
      ts: '2026-01-15T10:00:08.000Z',
      type: 'shell.exec',
      actor: 'proofpack-demo-agent',
      payload: { command: 'grep -r TODO workspace/' },
    },
    {
      event_id: 'd3e0baa5-0007-4000-a000-000000000007',
      ts: '2026-01-15T10:00:09.000Z',
      type: 'hold.request',
      actor: 'proofpack-demo-agent',
      payload: {
        hold_id: 'd3e0baa5-0006-4000-a000-000000000006',
        prompt: 'Approve shell: grep -r TODO workspace/?',
      },
    },
    {
      event_id: 'd3e0baa5-0008-4000-a000-000000000008',
      ts: '2026-01-15T10:00:30.000Z',
      type: 'hold.approve',
      actor: 'human-operator',
      payload: { hold_id: 'd3e0baa5-0006-4000-a000-000000000006', approved_by: 'human' },
    },
    {
      event_id: 'd3e0baa5-0009-4000-a000-000000000009',
      ts: '2026-01-15T10:00:31.000Z',
      type: 'shell.exec',
      actor: 'proofpack-demo-agent',
      payload: { command: 'grep -r TODO workspace/', result: '3 matches found' },
    },
    {
      event_id: 'd3e0baa5-000a-4000-a000-00000000000a',
      ts: '2026-01-15T10:00:35.000Z',
      type: 'net.http',
      actor: 'proofpack-demo-agent',
      payload: { url: 'https://api.example.com/data', method: 'GET' },
    },
    {
      event_id: 'd3e0baa5-000b-4000-a000-00000000000b',
      ts: '2026-01-15T10:00:40.000Z',
      type: 'fs.write',
      actor: 'proofpack-demo-agent',
      payload: { path: 'workspace/out/report.md', bytes: 1024 },
    },
    {
      event_id: 'd3e0baa5-000c-4000-a000-00000000000c',
      ts: '2026-01-15T10:00:41.000Z',
      type: 'fs.write',
      actor: 'proofpack-demo-agent',
      payload: { path: 'workspace/out/summary.json', bytes: 256 },
    },
    {
      event_id: 'd3e0baa5-000d-4000-a000-00000000000d',
      ts: '2026-01-15T10:00:45.000Z',
      type: 'run.end',
      actor: 'proofpack-demo-agent',
      payload: { exit_code: 0, duration_ms: 45000 },
    },
  ];
}

function zipPackToBuffer(
  raw: Record<string, Uint8Array>,
  inclusionProofs: Array<{ event_id: string }>,
): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-demo-'));
  fs.mkdirSync(path.join(tmpDir, 'events'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'policy'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'audit', 'inclusion_proofs'), { recursive: true });

  fs.writeFileSync(path.join(tmpDir, 'manifest.json'), raw.manifest!);
  fs.writeFileSync(path.join(tmpDir, 'receipt.json'), raw.receipt!);
  fs.writeFileSync(path.join(tmpDir, 'events', 'events.jsonl'), raw.events!);
  fs.writeFileSync(path.join(tmpDir, 'policy', 'policy.yml'), raw.policy!);
  fs.writeFileSync(path.join(tmpDir, 'policy', 'decisions.jsonl'), raw.decisions!);
  fs.writeFileSync(path.join(tmpDir, 'audit', 'merkle.json'), raw.merkle!);

  for (const proof of inclusionProofs) {
    const proofPath = path.join(tmpDir, 'audit', 'inclusion_proofs', `${proof.event_id}.json`);
    fs.writeFileSync(proofPath, canonicalizeString(proof) + '\n');
  }

  // Zip the directory
  const tmpZipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-out-'));
  const tmpZip = path.join(tmpZipDir, 'output.zip');
  try {
    execSync(`cd "${tmpDir}" && zip -qr "${tmpZip}" .`, { stdio: 'pipe' });
    const buffer = fs.readFileSync(tmpZip);
    return buffer;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(tmpZipDir, { recursive: true, force: true });
  }
}

let cachedDemoZip: Buffer | null = null;

function getDemoPackZip(): Buffer {
  if (cachedDemoZip) return cachedDemoZip;

  const events = makeDemoEvents();
  const decisions = evaluateAll(events, demoPolicy);
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

  cachedDemoZip = zipPackToBuffer(
    pack.raw as unknown as Record<string, Uint8Array>,
    pack.inclusionProofs,
  );
  return cachedDemoZip;
}

export async function GET() {
  const zip = getDemoPackZip();
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="demo.proofpack.zip"',
    },
  });
}
