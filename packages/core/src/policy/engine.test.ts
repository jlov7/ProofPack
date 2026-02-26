import { describe, it, expect } from 'vitest';
import { evaluateEvent, evaluateAll } from './engine.js';
import type { Policy } from '../types/policy.js';
import type { Event } from '../types/event.js';

const demoPolicy: Policy = {
  version: '0.1',
  defaults: { decision: 'deny' },
  rules: [
    {
      id: 'allow_read_workspace',
      when: { event_type: 'fs.read', path_glob: 'workspace/**' },
      decision: 'allow',
      severity: 'low',
      reason: 'Reading files inside workspace is allowed',
    },
    {
      id: 'hold_shell_exec',
      when: { event_type: 'shell.exec' },
      decision: 'hold',
      severity: 'high',
      reason: 'Shell execution requires human approval',
    },
    {
      id: 'deny_network',
      when: { event_type: 'net.http' },
      decision: 'deny',
      severity: 'critical',
      reason: 'Network access is denied by default (exfiltration risk)',
    },
    {
      id: 'allow_write_out',
      when: { event_type: 'fs.write', path_glob: 'workspace/out/**' },
      decision: 'allow',
      severity: 'medium',
      reason: 'Writes allowed only to workspace/out',
    },
  ],
};

function makeEvent(overrides: Partial<Event> & { type: Event['type'] }): Event {
  return {
    event_id: '00000000-0000-4000-a000-000000000001',
    ts: '2026-01-15T10:00:00.000Z',
    actor: 'test-agent',
    ...overrides,
  };
}

describe('evaluateEvent', () => {
  it('allows fs.read inside workspace', () => {
    const event = makeEvent({ type: 'fs.read', payload: { path: 'workspace/src/index.ts' } });
    const result = evaluateEvent(event, demoPolicy);
    expect(result.decision).toBe('allow');
    expect(result.rule_id).toBe('allow_read_workspace');
  });

  it('denies fs.read with path traversal (..)', () => {
    const event = makeEvent({ type: 'fs.read', payload: { path: 'workspace/../secrets.env' } });
    const result = evaluateEvent(event, demoPolicy);
    // Path contains ".." → glob match fails → falls through to default deny
    expect(result.decision).toBe('deny');
    expect(result.rule_id).toBe('_default');
  });

  it('denies fs.read outside workspace', () => {
    const event = makeEvent({ type: 'fs.read', payload: { path: '/etc/passwd' } });
    const result = evaluateEvent(event, demoPolicy);
    expect(result.decision).toBe('deny');
    expect(result.rule_id).toBe('_default');
  });

  it('holds shell.exec', () => {
    const event = makeEvent({
      type: 'shell.exec',
      payload: { command: 'grep -r TODO workspace/' },
    });
    const result = evaluateEvent(event, demoPolicy);
    expect(result.decision).toBe('hold');
    expect(result.rule_id).toBe('hold_shell_exec');
  });

  it('denies net.http', () => {
    const event = makeEvent({ type: 'net.http', payload: { url: 'https://api.example.com' } });
    const result = evaluateEvent(event, demoPolicy);
    expect(result.decision).toBe('deny');
    expect(result.rule_id).toBe('deny_network');
    expect(result.severity).toBe('critical');
  });

  it('allows fs.write to workspace/out', () => {
    const event = makeEvent({ type: 'fs.write', payload: { path: 'workspace/out/report.md' } });
    const result = evaluateEvent(event, demoPolicy);
    expect(result.decision).toBe('allow');
    expect(result.rule_id).toBe('allow_write_out');
  });

  it('denies fs.write outside workspace/out', () => {
    const event = makeEvent({ type: 'fs.write', payload: { path: 'workspace/src/index.ts' } });
    const result = evaluateEvent(event, demoPolicy);
    expect(result.decision).toBe('deny');
    expect(result.rule_id).toBe('_default');
  });

  it('default-denies unknown event types', () => {
    const event = makeEvent({ type: 'run.start' });
    const result = evaluateEvent(event, demoPolicy);
    expect(result.decision).toBe('deny');
    expect(result.rule_id).toBe('_default');
  });

  it('matches first rule when multiple could match', () => {
    // If we had two rules matching fs.read, the first one should win
    const policy: Policy = {
      version: '0.1',
      defaults: { decision: 'deny' },
      rules: [
        {
          id: 'first',
          when: { event_type: 'fs.read' },
          decision: 'hold',
          severity: 'medium',
          reason: 'First rule',
        },
        {
          id: 'second',
          when: { event_type: 'fs.read' },
          decision: 'allow',
          severity: 'low',
          reason: 'Second rule',
        },
      ],
    };
    const event = makeEvent({ type: 'fs.read', payload: { path: 'anything' } });
    const result = evaluateEvent(event, policy);
    expect(result.rule_id).toBe('first');
    expect(result.decision).toBe('hold');
  });

  it('matches tool field when specified', () => {
    const policy: Policy = {
      version: '0.1',
      defaults: { decision: 'deny' },
      rules: [
        {
          id: 'allow_grep',
          when: { event_type: 'tool.call', tool: 'grep' },
          decision: 'allow',
          severity: 'low',
          reason: 'Allow grep',
        },
      ],
    };

    const matchEvent = makeEvent({ type: 'tool.call', payload: { tool: 'grep' } });
    expect(evaluateEvent(matchEvent, policy).decision).toBe('allow');

    const noMatchEvent = makeEvent({ type: 'tool.call', payload: { tool: 'rm' } });
    expect(evaluateEvent(noMatchEvent, policy).decision).toBe('deny');
  });

  it('matches contains field', () => {
    const policy: Policy = {
      version: '0.1',
      defaults: { decision: 'deny' },
      rules: [
        {
          id: 'contains_test',
          when: { event_type: 'shell.exec', contains: 'TODO' },
          decision: 'allow',
          severity: 'low',
          reason: 'Has TODO',
        },
      ],
    };

    const matchEvent = makeEvent({ type: 'shell.exec', payload: { command: 'grep -r TODO .' } });
    expect(evaluateEvent(matchEvent, policy).decision).toBe('allow');

    const noMatch = makeEvent({ type: 'shell.exec', payload: { command: 'ls' } });
    expect(evaluateEvent(noMatch, policy).decision).toBe('deny');
  });
});

describe('evaluateAll', () => {
  it('produces decisions for all events', () => {
    const events: Event[] = [
      makeEvent({
        event_id: '00000000-0000-4000-a000-000000000001',
        type: 'fs.read',
        payload: { path: 'workspace/a.ts' },
      }),
      makeEvent({
        event_id: '00000000-0000-4000-a000-000000000002',
        type: 'net.http',
        payload: { url: 'https://evil.com' },
      }),
      makeEvent({
        event_id: '00000000-0000-4000-a000-000000000003',
        type: 'shell.exec',
        payload: { command: 'ls' },
      }),
    ];
    const decisions = evaluateAll(events, demoPolicy);
    expect(decisions).toHaveLength(3);
    expect(decisions[0]!.decision).toBe('allow');
    expect(decisions[1]!.decision).toBe('deny');
    expect(decisions[2]!.decision).toBe('hold');
  });
});
