import 'server-only';
import { currentUser } from '@clerk/nextjs/server';
import { upsertParentByClerkId, type Parent } from '@/db/queries/parents';

export async function ensureParent(): Promise<Parent> {
  const user = await currentUser();
  if (!user) throw new Error('unauthorized');
  const email =
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error('clerk user has no email address');
  return upsertParentByClerkId({ clerkUserId: user.id, email });
}
