import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getParentByClerkId } from '@/db/queries/parents';
import { getKidProfileByIdForParent } from '@/db/queries/kidProfiles';
import type { KidProfile, Parent } from '@/db/schema';

export async function requireParent(): Promise<Parent> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parent = await getParentByClerkId(userId);
  if (!parent) redirect('/sign-in');
  return parent;
}

export async function requireParentKid(
  kidId: string,
): Promise<{ parent: Parent; kid: KidProfile }> {
  const parent = await requireParent();
  const kid = await getKidProfileByIdForParent(parent.id, kidId);
  if (!kid) notFound();
  return { parent, kid };
}
