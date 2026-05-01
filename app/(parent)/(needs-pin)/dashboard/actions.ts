'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireParent } from '@/lib/parent/context';
import { createKidProfile } from '@/db/queries/kidProfiles';

const schema = z.object({
  displayName: z.string().min(1).max(40),
});

export async function createKidAction(formData: FormData) {
  const parent = await requireParent();
  const { displayName } = schema.parse({
    displayName: formData.get('displayName'),
  });
  await createKidProfile(parent.id, { displayName });
  revalidatePath('/dashboard');
  revalidatePath('/profiles');
}
