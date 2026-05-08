import type { VerifyApiResponse } from './store';

const API_BASE = '';

export interface VerifyRequestOptions {
  profile?: 'standard' | 'strict' | 'permissive';
  trustStore?: string;
  requireTrustedKey?: boolean;
  requireTimestampAnchor?: boolean;
}

interface ApiErrorPayload {
  ok: false;
  error: { code: string; message: string; hint?: string };
}

async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as ApiErrorPayload;
    if (parsed?.error?.code && parsed.error.message) {
      return [parsed.error.code, parsed.error.message, parsed.error.hint]
        .filter(Boolean)
        .join(': ');
    }
  } catch {
    // Fall through to the raw response text below.
  }
  return `${fallback} (${res.status}): ${text}`;
}

export async function verifyPack(
  file: File | Blob,
  options: VerifyRequestOptions = {},
): Promise<VerifyApiResponse> {
  const form = new FormData();
  form.append('file', file);
  if (options.profile) form.append('profile', options.profile);
  if (options.trustStore?.trim()) form.append('trustStore', options.trustStore);
  if (options.requireTrustedKey) form.append('requireTrustedKey', 'true');
  if (options.requireTimestampAnchor) form.append('requireTimestampAnchor', 'true');

  const res = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, 'Verification failed'));
  }

  return res.json() as Promise<VerifyApiResponse>;
}

export async function fetchDemoPack(): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/api/demo-pack`);
  if (!res.ok) throw new Error(`Failed to fetch demo pack: ${res.status}`);
  return res.arrayBuffer();
}

export async function redactPack(file: File | Blob): Promise<ArrayBuffer> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/api/redact`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, 'Redaction failed'));
  }

  return res.arrayBuffer();
}
