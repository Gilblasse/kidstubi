'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getParentByClerkId, getPinHashForParent } from '@/db/queries/parents';
import { verifyPin } from '@/lib/auth/pin';
import { clearActiveKidId } from '@/lib/auth/activeKid';

const schema = z.object({ pin: z.string().regex(/^\d{4,8}$/) });

export async function exitKidMode(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('unauthorized');
  const parsed = schema.safeParse({ pin: formData.get('pin') });
  if (!parsed.success) throw new Error('invalid PIN');
  const parent = await getParentByClerkId(userId);
  if (!parent) throw new Error('invalid PIN');
  const hash = await getPinHashForParent(parent.id);
  if (!hash) throw new Error('invalid PIN');
  const ok = await verifyPin(parsed.data.pin, hash);
  if (!ok) throw new Error('invalid PIN');
  await clearActiveKidId();
  redirect('/dashboard');
}
