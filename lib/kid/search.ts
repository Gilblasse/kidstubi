import 'server-only';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { insertSearchHistory } from '@/db/queries/search';
import { listKidKeywords } from '@/db/queries/viewingRules';
import { searchVideosSafe, type SearchResult } from '@/lib/youtube/search';
import { listVideoMetadata } from '@/lib/youtube/videos';
import { isMaxContentRating, isVideoAllowed } from '@/lib/kid/viewingRules';
import { send } from '@/lib/notifications';
import type { KidProfile, Parent } from '@/db/schema';

export async function runKidSearch(
  parent: Parent,
  kid: KidProfile,
  query: string,
): Promise<SearchResult[]> {
  if (!kid.searchEnabled) throw new Error('search_disabled');

  const rawResults = await searchVideosSafe(query);

  const [parentBlocklist, kidBlocklist] = await Promise.all([
    listBlocklistForParent(parent.id),
    listKidKeywords(parent.id, kid.id),
  ]);
  const parentKeywords = parentBlocklist.map((b) => b.keyword);
  const kidKeywords = kidBlocklist.map((b) => b.keyword);

  const ratingByVideoId = new Map<string, Awaited<ReturnType<typeof listVideoMetadata>>[number]['rating']>();
  if (rawResults.length > 0) {
    const meta = await listVideoMetadata(rawResults.map((r) => r.videoId));
    for (const m of meta) ratingByVideoId.set(m.videoId, m.rating);
  }

  const maxRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';

  const filtered = rawResults.filter((r) => {
    const decision = isVideoAllowed(
      {
        title: r.title,
        description: r.description,
        channelTitle: r.channelTitle,
        rating: ratingByVideoId.get(r.videoId) ?? {},
      },
      { maxRating, kidKeywords, parentKeywords },
    );
    return decision.allowed;
  });

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
