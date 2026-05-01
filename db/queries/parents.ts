import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { parents, type Parent } from '../schema';

export async function getParentByClerkId(clerkUserId: string): Promise<Parent | null> {
  const rows = await getDb()
    .select()
    .from(parents)
    .where(eq(parents.clerkUserId, clerkUserId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertParentByClerkId(input: {
  clerkUserId: string;
  email: string;
}): Promise<Parent> {
  const rows = await getDb()
    .insert(parents)
    .values({ clerkUserId: input.clerkUserId, email: input.email })
    .onConflictDoUpdate({
      target: parents.clerkUserId,
      set: { email: input.email },
    })
    .returning();
  return rows[0]!;
}

export async function setPinHash(parentId: string, pinHash: string): Promise<void> {
  await getDb().update(parents).set({ pinHash }).where(eq(parents.id, parentId));
}

export async function getPinHashForParent(parentId: string): Promise<string | null> {
  const rows = await getDb()
    .select({ pinHash: parents.pinHash })
    .from(parents)
    .where(eq(parents.id, parentId))
    .limit(1);
  return rows[0]?.pinHash ?? null;
}

export type { Parent, NewParent } from '../schema';
