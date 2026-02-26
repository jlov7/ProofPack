import type { VerifyApiResponse } from './store';

const API_BASE = '';

export async function verifyPack(file: File | Blob): Promise<VerifyApiResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Verification failed (${res.status}): ${text}`);
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
    const text = await res.text();
    throw new Error(`Redaction failed (${res.status}): ${text}`);
  }

  return res.arrayBuffer();
}
