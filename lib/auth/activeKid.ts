import 'server-only';
import { cookies } from 'next/headers';
import { signValue, verifySigned } from './cookie';

export const ACTIVE_KID_COOKIE = 'active_kid_profile';

const ONE_DAY = 60 * 60 * 24;

export async function getActiveKidId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(ACTIVE_KID_COOKIE)?.value;
  return verifySigned(raw);
}

export async function setActiveKidId(kidProfileId: string): Promise<void> {
  const signed = await signValue(kidProfileId);
  const jar = await cookies();
  jar.set(ACTIVE_KID_COOKIE, signed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_DAY,
  });
}

export async function clearActiveKidId(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACTIVE_KID_COOKIE);
}
