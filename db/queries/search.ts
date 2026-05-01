import 'server-only';
import { and, desc, eq, gt } from 'drizzle-orm';
import { getDb } from '../client';
import {
  kidProfiles,
  searchHistory,
  type SearchHistoryEntry,
} from '../schema';

const DEDUPE_WINDOW_SECONDS = 60;

export async function insertSearchHistory(input: {
  parentId: string;
  kidProfileId: string;
  query: string;
  resultCount: number;
}): Promise<SearchHistoryEntry | null> {
  const db = getDb();
  const kid = await db
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(
      and(
        eq(kidProfiles.id, input.kidProfileId),
        eq(kidProfiles.parentId, input.parentId),
      ),
    )
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');

  const since = new Date(Date.now() - DEDUPE_WINDOW_SECONDS * 1000);
  const recent = await db
    .select({ id: searchHistory.id })
    .from(searchHistory)
    .where(
      and(
        eq(searchHistory.kidProfileId, input.kidProfileId),
        eq(searchHistory.query, input.query),
        gt(searchHistory.searchedAt, since),
      ),
    )
    .limit(1);
  if (recent[0]) return null;

  const rows = await db
    .insert(searchHistory)
    .values({
      kidProfileId: input.kidProfileId,
      query: input.query,
      resultCount: input.resultCount,
    })
    .returning();
  return rows[0] ?? null;
}

export async function listSearchHistoryForKid(
  parentId: string,
  kidProfileId: string,
  limit = 100,
): Promise<SearchHistoryEntry[]> {
  const rows = await getDb()
    .select({ s: searchHistory })
    .from(searchHistory)
    .innerJoin(kidProfiles, eq(searchHistory.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(searchHistory.kidProfileId, kidProfileId),
      ),
    )
    .orderBy(desc(searchHistory.searchedAt))
    .limit(limit);
  return rows.map((r) => r.s);
}

export type { SearchHistoryEntry, NewSearchHistoryEntry } from '../schema';
