'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getParentByClerkId, getPinHashForParent } from '@/db/queries/parents';
import { verifyPin } from '@/lib/auth/pin';
import { clearActiveKidId } from '@/lib/auth/activeKid';

const schema = z.object({ pin: z.string().regex(/^\d{4,8}$/) });

export async function verifyPinAction(pin: string): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };
  const parsed = schema.safeParse({ pin });
  if (!parsed.success) return { ok: false };
  const parent = await getParentByClerkId(userId);
  if (!parent) return { ok: false };
  const hash = await getPinHashForParent(parent.id);
  if (!hash) return { ok: false };
  const ok = await verifyPin(parsed.data.pin, hash);
  if (!ok) return { ok: false };
  await clearActiveKidId();
  return { ok: true };
}
