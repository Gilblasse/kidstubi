'use server';

import { requireKidContext } from '@/lib/kid/context';
import { listApprovedVideosForKid } from '@/db/queries/videos';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { listKidKeywords } from '@/db/queries/viewingRules';
import {
  listDiscoveryVideos,
  type DiscoveryPageTokens,
  type VideoMetadata,
} from '@/lib/youtube/videos';
import { isMaxContentRating, isVideoAllowed } from '@/lib/kid/viewingRules';

export type LoadMoreResult = {
  videos: VideoMetadata[];
  nextTokens: DiscoveryPageTokens;
  hasMore: boolean;
};

export async function loadMoreDiscoveryAction(
  kidId: string,
  tokens: DiscoveryPageTokens,
  excludeIds: string[],
): Promise<LoadMoreResult> {
  const { parent, kid } = await requireKidContext(kidId);
  if (!kid.discoveryEnabled) {
    return { videos: [], nextTokens: {}, hasMore: false };
  }
  const [page, parentBlocklist, kidBlocklist, approved] = await Promise.all([
    listDiscoveryVideos(tokens),
    listBlocklistForParent(parent.id),
    listKidKeywords(parent.id, kid.id),
    listApprovedVideosForKid(parent.id, kid.id),
  ]);
  const maxRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';
  const exclude = new Set<string>([
    ...excludeIds,
    ...approved.map((v) => v.youtubeVideoId),
  ]);
  const filtered = page.videos.filter((v) => {
    if (exclude.has(v.videoId)) return false;
    return isVideoAllowed(
      {
        title: v.title,
        description: v.description,
        channelTitle: v.channelTitle,
        rating: v.rating,
      },
      {
        maxRating,
        kidKeywords: kidBlocklist.map((b) => b.keyword),
        parentKeywords: parentBlocklist.map((b) => b.keyword),
      },
    ).allowed;
  });
  return {
    videos: filtered,
    nextTokens: page.nextTokens,
    hasMore: page.hasMore,
  };
}
