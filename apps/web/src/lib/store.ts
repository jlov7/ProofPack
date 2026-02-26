'use client';

import { create } from 'zustand';
import type { EventPreview, VerificationCheck } from '@proofpack/core';

export type AppScreen =
  | 'verify'
  | 'report'
  | 'timeline'
  | 'proofs'
  | 'policy'
  | 'disclosure'
  | 'export';

export interface PolicyRulePreview {
  id: string;
  when: Record<string, string>;
  decision: string;
  severity: string;
  reason: string;
}

export interface DecisionPreview {
  event_id: string;
  rule_id: string;
  decision: string;
  severity: string;
  reason: string;
}

export interface VerifyApiResponse {
  ok: boolean;
  summary: {
    verified: boolean;
    run_id: string;
    created_at: string;
    producer: { name: string; version: string };
  };
  checks: VerificationCheck[];
  events_preview: EventPreview[];
  policy_rules?: PolicyRulePreview[];
  decisions?: DecisionPreview[];
  error?: { code: string; message: string; hint?: string };
}

export interface TamperResult {
  original: VerifyApiResponse;
  tampered: VerifyApiResponse;
}

interface PackState {
  /** Current loaded report from verification */
  report: VerifyApiResponse | null;

  /** The zip buffer for the currently loaded pack */
  packZip: ArrayBuffer | null;

  /** Currently selected event in timeline */
  selectedEventId: string | null;

  /** Tamper simulation result */
  tamperResult: TamperResult | null;

  /** Loading states */
  verifying: boolean;
  redacting: boolean;

  /** Error message */
  error: string | null;

  /** Actions */
  setReport: (report: VerifyApiResponse) => void;
  setPackZip: (zip: ArrayBuffer) => void;
  setSelectedEventId: (id: string | null) => void;
  setTamperResult: (result: TamperResult | null) => void;
  setVerifying: (v: boolean) => void;
  setRedacting: (v: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePackStore = create<PackState>((set) => ({
  report: null,
  packZip: null,
  selectedEventId: null,
  tamperResult: null,
  verifying: false,
  redacting: false,
  error: null,

  setReport: (report) => set({ report, error: null }),
  setPackZip: (zip) => set({ packZip: zip }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  setTamperResult: (result) => set({ tamperResult: result }),
  setVerifying: (v) => set({ verifying: v }),
  setRedacting: (v) => set({ redacting: v }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      report: null,
      packZip: null,
      selectedEventId: null,
      tamperResult: null,
      verifying: false,
      redacting: false,
      error: null,
    }),
}));
