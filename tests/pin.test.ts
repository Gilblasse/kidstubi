import { describe, expect, it } from 'vitest';
import { hashPin, verifyPin } from '@/lib/auth/pin';

describe('PIN hashing', () => {
  it('round-trips a 4-digit pin', async () => {
    const hash = await hashPin('1234');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPin('1234', hash)).toBe(true);
  });

  it('rejects wrong pin with same length', async () => {
    const hash = await hashPin('1234');
    expect(await verifyPin('5678', hash)).toBe(false);
  });

  it('rejects wrong pin with different length', async () => {
    const hash = await hashPin('1234');
    expect(await verifyPin('12345', hash)).toBe(false);
  });

  it('produces different hashes for the same pin (salt)', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).not.toBe(b);
    expect(await verifyPin('1234', a)).toBe(true);
    expect(await verifyPin('1234', b)).toBe(true);
  });
});
