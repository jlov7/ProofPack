export interface ApiMetricsSnapshot {
  verify_requests_total: number;
  verify_failures_total: number;
  verify_last_duration_ms: number;
  redact_requests_total: number;
  redact_failures_total: number;
  redact_last_duration_ms: number;
}

const metrics: ApiMetricsSnapshot = {
  verify_requests_total: 0,
  verify_failures_total: 0,
  verify_last_duration_ms: 0,
  redact_requests_total: 0,
  redact_failures_total: 0,
  redact_last_duration_ms: 0,
};

export function recordVerifyRequest(durationMs: number, ok: boolean): void {
  metrics.verify_requests_total += 1;
  metrics.verify_last_duration_ms = durationMs;
  if (!ok) {
    metrics.verify_failures_total += 1;
  }
}

export function recordRedactRequest(durationMs: number, ok: boolean): void {
  metrics.redact_requests_total += 1;
  metrics.redact_last_duration_ms = durationMs;
  if (!ok) {
    metrics.redact_failures_total += 1;
  }
}

export function getMetricsSnapshot(): ApiMetricsSnapshot {
  return { ...metrics };
}

export function resetMetricsForTests(): void {
  metrics.verify_requests_total = 0;
  metrics.verify_failures_total = 0;
  metrics.verify_last_duration_ms = 0;
  metrics.redact_requests_total = 0;
  metrics.redact_failures_total = 0;
  metrics.redact_last_duration_ms = 0;
}
