import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import {
  approvedVideos,
  kidProfiles,
  kidSearchBlocklist,
  type KidSearchBlocklistKeyword,
  type MaxContentRating,
} from '../schema';

export async function updateKidMaxRating(
  parentId: string,
  kidProfileId: string,
  maxContentRating: MaxContentRating,
): Promise<void> {
  await getDb()
    .update(kidProfiles)
    .set({ maxContentRating })
    .where(
      and(
        eq(kidProfiles.id, kidProfileId),
        eq(kidProfiles.parentId, parentId),
      ),
    );
}

export async function updateKidDiscoveryEnabled(
  parentId: string,
  kidProfileId: string,
  discoveryEnabled: boolean,
): Promise<void> {
  await getDb()
    .update(kidProfiles)
    .set({ discoveryEnabled })
    .where(
      and(
        eq(kidProfiles.id, kidProfileId),
        eq(kidProfiles.parentId, parentId),
      ),
    );
}

export async function listKidKeywords(
  parentId: string,
  kidProfileId: string,
): Promise<KidSearchBlocklistKeyword[]> {
  const rows = await getDb()
    .select({ k: kidSearchBlocklist })
    .from(kidSearchBlocklist)
    .innerJoin(kidProfiles, eq(kidSearchBlocklist.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(kidSearchBlocklist.kidProfileId, kidProfileId),
      ),
    )
    .orderBy(asc(kidSearchBlocklist.keyword));
  return rows.map((r) => r.k);
}

export async function addKidKeyword(
  parentId: string,
  kidProfileId: string,
  keyword: string,
): Promise<KidSearchBlocklistKeyword | null> {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return null;
  const kid = await getDb()
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(
      and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)),
    )
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  const existing = await getDb()
    .select({ id: kidSearchBlocklist.id })
    .from(kidSearchBlocklist)
    .where(
      and(
        eq(kidSearchBlocklist.kidProfileId, kidProfileId),
        eq(kidSearchBlocklist.keyword, trimmed),
      ),
    )
    .limit(1);
  if (existing[0]) return null;
  const rows = await getDb()
    .insert(kidSearchBlocklist)
    .values({ kidProfileId, keyword: trimmed })
    .returning();
  return rows[0] ?? null;
}

export async function removeKidKeyword(
  parentId: string,
  kidProfileId: string,
  id: string,
): Promise<void> {
  const kid = await getDb()
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(
      and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)),
    )
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  await getDb()
    .delete(kidSearchBlocklist)
    .where(
      and(
        eq(kidSearchBlocklist.id, id),
        eq(kidSearchBlocklist.kidProfileId, kidProfileId),
      ),
    );
}

export async function updateApprovedVideoRatingCache(
  parentId: string,
  kidProfileId: string,
  youtubeVideoId: string,
  patch: { contentRating: string | null; madeForKids: boolean | null },
): Promise<void> {
  const kid = await getDb()
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(
      and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)),
    )
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  await getDb()
    .update(approvedVideos)
    .set(patch)
    .where(
      and(
        eq(approvedVideos.kidProfileId, kidProfileId),
        eq(approvedVideos.youtubeVideoId, youtubeVideoId),
      ),
    );
}
