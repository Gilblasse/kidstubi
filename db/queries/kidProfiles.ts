import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { kidProfiles, type KidProfile, type NewKidProfile } from '../schema';

export async function listKidProfilesForParent(parentId: string): Promise<KidProfile[]> {
  return getDb().select().from(kidProfiles).where(eq(kidProfiles.parentId, parentId));
}

export async function getKidProfileByIdForParent(
  parentId: string,
  kidProfileId: string,
): Promise<KidProfile | null> {
  const rows = await getDb()
    .select()
    .from(kidProfiles)
    .where(and(eq(kidProfiles.parentId, parentId), eq(kidProfiles.id, kidProfileId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createKidProfile(
  parentId: string,
  input: Omit<NewKidProfile, 'id' | 'parentId' | 'createdAt'>,
): Promise<KidProfile> {
  const rows = await getDb()
    .insert(kidProfiles)
    .values({ ...input, parentId })
    .returning();
  return rows[0]!;
}

export async function updateKidSearchSettings(
  parentId: string,
  kidProfileId: string,
  patch: { searchEnabled?: boolean; liveSearchAlerts?: boolean },
): Promise<void> {
  await getDb()
    .update(kidProfiles)
    .set(patch)
    .where(
      and(
        eq(kidProfiles.id, kidProfileId),
        eq(kidProfiles.parentId, parentId),
      ),
    );
}

export type { KidProfile, NewKidProfile } from '../schema';
