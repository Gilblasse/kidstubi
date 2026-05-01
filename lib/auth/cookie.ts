import 'server-only';

function getSecret(): string {
  const s = process.env.ACTIVE_KID_COOKIE_SECRET;
  if (!s) throw new Error('ACTIVE_KID_COOKIE_SECRET is not set');
  return s;
}

async function hmac(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signValue(value: string): Promise<string> {
  return `${value}.${await hmac(value)}`;
}

export async function verifySigned(raw: string | undefined | null): Promise<string | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const value = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = await hmac(value);
  if (!timingSafeEqualHex(signature, expected)) return null;
  return value;
}
