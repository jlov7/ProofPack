import type { Event } from '@proofpack/core';

export const DEMO_RUN_ID = 'd3e0baa5-de10-4000-a000-000000000000';

export function makeDemoEvents(): Event[] {
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
