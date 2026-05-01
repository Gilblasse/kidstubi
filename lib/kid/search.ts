import 'server-only';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { insertSearchHistory } from '@/db/queries/search';
import { searchVideosSafe, type SearchResult } from '@/lib/youtube/search';
import { send } from '@/lib/notifications';
import type { KidProfile, Parent } from '@/db/schema';

function blocklistMatches(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export async function runKidSearch(
  parent: Parent,
  kid: KidProfile,
  query: string,
): Promise<SearchResult[]> {
  if (!kid.searchEnabled) throw new Error('search_disabled');

  const rawResults = await searchVideosSafe(query);
  const blocklist = (await listBlocklistForParent(parent.id)).map(
    (b) => b.keyword,
  );
  const filtered: SearchResult[] = blocklist.length
    ? rawResults.filter(
        (r) =>
          !blocklistMatches(r.title, blocklist) &&
          !blocklistMatches(r.description, blocklist) &&
          !blocklistMatches(r.channelTitle, blocklist),
      )
    : rawResults;

  const inserted = await insertSearchHistory({
    parentId: parent.id,
    kidProfileId: kid.id,
    query,
    resultCount: filtered.length,
  });

  if (inserted && kid.liveSearchAlerts) {
    await send({
      parentId: parent.id,
      parentEmail: parent.email,
      kind: 'live_search_alert',
      title: `${kid.displayName} just searched`,
      body: `Query: "${query}" — ${filtered.length} results.`,
      href: `/kids/${kid.id}/search-history`,
      email: {
        subject: `${kid.displayName} just searched: ${query}`,
        text: `${kid.displayName} searched for "${query}" and saw ${filtered.length} results.`,
        html: `<p><strong>${kid.displayName}</strong> searched for <em>"${query}"</em> and saw ${filtered.length} results.</p>`,
      },
    });
  }

  return filtered;
}
