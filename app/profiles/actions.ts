'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getParentByClerkId } from '@/db/queries/parents';
import { getKidProfileByIdForParent } from '@/db/queries/kidProfiles';
import { setActiveKidId } from '@/lib/auth/activeKid';

const schema = z.object({ kidProfileId: z.string().uuid() });

export async function setActiveKidProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('unauthorized');
  const parent = await getParentByClerkId(userId);
  if (!parent) throw new Error('parent not found');
  if (!parent.pinHash) redirect('/setup-pin');
  const { kidProfileId } = schema.parse({
    kidProfileId: formData.get('kidProfileId'),
  });
  const kid = await getKidProfileByIdForParent(parent.id, kidProfileId);
  if (!kid) throw new Error('kid profile not found');
  await setActiveKidId(kid.id);
  redirect(`/k/${kid.id}`);
}
