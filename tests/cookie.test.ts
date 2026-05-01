import { beforeAll, describe, expect, it } from 'vitest';
import { signValue, verifySigned } from '@/lib/auth/cookie';

beforeAll(() => {
  process.env.ACTIVE_KID_COOKIE_SECRET = 'test-secret-do-not-ship';
});

describe('cookie HMAC sign/verify', () => {
  it('round-trips a value', async () => {
    const signed = await signValue('kid-uuid');
    expect(signed.startsWith('kid-uuid.')).toBe(true);
    expect(await verifySigned(signed)).toBe('kid-uuid');
  });

  it('rejects tampered value', async () => {
    const signed = await signValue('kid-uuid');
    const tampered = signed.replace('kid-uuid', 'attacker');
    expect(await verifySigned(tampered)).toBeNull();
  });

  it('rejects tampered signature', async () => {
    const signed = await signValue('kid-uuid');
    const dot = signed.lastIndexOf('.');
    const tampered = `${signed.slice(0, dot + 1)}${'0'.repeat(64)}`;
    expect(await verifySigned(tampered)).toBeNull();
  });

  it('rejects empty/missing', async () => {
    expect(await verifySigned(undefined)).toBeNull();
    expect(await verifySigned('')).toBeNull();
    expect(await verifySigned('no-dot-here')).toBeNull();
  });

  it('different secrets produce different signatures', async () => {
    process.env.ACTIVE_KID_COOKIE_SECRET = 'secret-a';
    const sigA = await signValue('kid');
    process.env.ACTIVE_KID_COOKIE_SECRET = 'secret-b';
    const sigB = await signValue('kid');
    expect(sigA).not.toBe(sigB);
    process.env.ACTIVE_KID_COOKIE_SECRET = 'test-secret-do-not-ship';
  });
});
