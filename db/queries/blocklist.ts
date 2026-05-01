import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import {
  searchBlocklist,
  type SearchBlocklistKeyword,
} from '../schema';

export async function listBlocklistForParent(
  parentId: string,
): Promise<SearchBlocklistKeyword[]> {
  return getDb()
    .select()
    .from(searchBlocklist)
    .where(eq(searchBlocklist.parentId, parentId))
    .orderBy(asc(searchBlocklist.keyword));
}

export async function addBlocklistKeyword(
  parentId: string,
  keyword: string,
): Promise<SearchBlocklistKeyword | null> {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return null;
  const existing = await getDb()
    .select({ id: searchBlocklist.id })
    .from(searchBlocklist)
    .where(
      and(
        eq(searchBlocklist.parentId, parentId),
        eq(searchBlocklist.keyword, trimmed),
      ),
    )
    .limit(1);
  if (existing[0]) return null;
  const rows = await getDb()
    .insert(searchBlocklist)
    .values({ parentId, keyword: trimmed })
    .returning();
  return rows[0] ?? null;
}

export async function removeBlocklistKeyword(
  parentId: string,
  id: string,
): Promise<void> {
  await getDb()
    .delete(searchBlocklist)
    .where(
      and(eq(searchBlocklist.id, id), eq(searchBlocklist.parentId, parentId)),
    );
}

export type {
  SearchBlocklistKeyword,
  NewSearchBlocklistKeyword,
} from '../schema';
