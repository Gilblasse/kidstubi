import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getActiveKidId } from '@/lib/auth/activeKid';
import { getParentByClerkId } from '@/db/queries/parents';
import { getKidProfileByIdForParent } from '@/db/queries/kidProfiles';
import type { KidProfile, Parent } from '@/db/schema';

export type KidContext = {
  parent: Parent;
  kid: KidProfile;
};

export async function requireKidContext(urlKidId: string): Promise<KidContext> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parent = await getParentByClerkId(userId);
  if (!parent) redirect('/sign-in');
  const activeKidId = await getActiveKidId();
  if (!activeKidId || activeKidId !== urlKidId) notFound();
  const kid = await getKidProfileByIdForParent(parent.id, urlKidId);
  if (!kid) notFound();
  return { parent, kid };
}
