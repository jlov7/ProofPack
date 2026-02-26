import micromatch from 'micromatch';
import type { Policy, PolicyRule, Decision, DecisionValue, Severity } from '../types/policy.js';
import type { Event } from '../types/event.js';

export interface PolicyEvalResult {
  rule_id: string;
  decision: DecisionValue;
  severity: Severity;
  reason: string;
}

/** Evaluate a single event against the policy. Returns the matched rule result or default-deny. */
export function evaluateEvent(event: Event, policy: Policy): PolicyEvalResult {
  for (const rule of policy.rules) {
    if (matchesRule(event, rule)) {
      return {
        rule_id: rule.id,
        decision: rule.decision,
        severity: rule.severity,
        reason: rule.reason,
      };
    }
  }
  // Default deny
  return {
    rule_id: '_default',
    decision: policy.defaults.decision,
    severity: 'medium',
    reason: 'No matching rule (default deny)',
  };
}

/** Evaluate all events against the policy, producing a Decision array. */
export function evaluateAll(events: Event[], policy: Policy): Decision[] {
  return events.map((event) => {
    const result = evaluateEvent(event, policy);
    return {
      event_id: event.event_id,
      ts: event.ts,
      rule_id: result.rule_id,
      decision: result.decision,
      severity: result.severity,
      reason: result.reason,
    };
  });
}

function matchesRule(event: Event, rule: PolicyRule): boolean {
  // 1. Check event_type exact match
  if (rule.when.event_type !== event.type) {
    return false;
  }

  // 2. Check tool exact match (if rule specifies tool)
  if (rule.when.tool !== undefined) {
    if (event.payload?.tool !== rule.when.tool) {
      return false;
    }
  }

  // 3. Check path_glob (if rule specifies path_glob)
  if (rule.when.path_glob !== undefined) {
    const path = event.payload?.path as string | undefined;
    if (!path) {
      return false;
    }
    // Safety: reject path traversal
    if (path.includes('..')) {
      return false;
    }
    if (!micromatch.isMatch(path, rule.when.path_glob)) {
      return false;
    }
  }

  // 4. Check contains (if rule specifies contains)
  if (rule.when.contains !== undefined) {
    if (!JSON.stringify(event.payload ?? {}).includes(rule.when.contains)) {
      return false;
    }
  }

  return true;
}
