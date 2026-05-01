'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ensureParent } from '@/lib/clerk/ensureParent';
import { hashPin } from '@/lib/auth/pin';
import { setPinHash } from '@/db/queries/parents';

const schema = z.object({ pin: z.string().regex(/^\d{4,8}$/) });

export async function setPinAction(formData: FormData) {
  const { pin } = schema.parse({ pin: formData.get('pin') });
  const parent = await ensureParent();
  const hash = await hashPin(pin);
  await setPinHash(parent.id, hash);
  redirect('/dashboard');
}
