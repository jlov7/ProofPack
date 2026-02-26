import { z } from 'zod';

export const DecisionValueSchema = z.enum(['allow', 'deny', 'hold']);
export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const PolicyHoldSchema = z.object({
  prompt: z.string(),
});

export const PolicyWhenSchema = z.object({
  event_type: z.string(),
  tool: z.string().optional(),
  path_glob: z.string().optional(),
  contains: z.string().optional(),
});

export const PolicyRuleSchema = z.object({
  id: z.string(),
  when: PolicyWhenSchema,
  decision: DecisionValueSchema,
  severity: SeveritySchema,
  reason: z.string(),
  hold: PolicyHoldSchema.optional(),
});

export const PolicySchema = z.object({
  version: z.string(),
  defaults: z.object({
    decision: DecisionValueSchema,
  }),
  rules: z.array(PolicyRuleSchema),
});

export const DecisionSchema = z.object({
  event_id: z.string().uuid(),
  ts: z.string().datetime(),
  rule_id: z.string(),
  decision: DecisionValueSchema,
  severity: SeveritySchema,
  reason: z.string(),
  explain: z.record(z.unknown()).optional(),
});

export type Policy = z.infer<typeof PolicySchema>;
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type DecisionValue = z.infer<typeof DecisionValueSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
