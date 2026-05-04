import { requireKidContext } from '@/lib/kid/context';
import { listApprovedVideosForKid } from '@/db/queries/videos';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { listKidKeywords } from '@/db/queries/viewingRules';
import { listDiscoveryVideos } from '@/lib/youtube/videos';
import { isMaxContentRating, isVideoAllowed } from '@/lib/kid/viewingRules';
import { DiscoveryShelfClient } from '@/components/kid/DiscoveryShelfClient';
import { MyVideosView } from '@/components/kid/MyVideosView';

export default async function KidHomePage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireKidContext(kidId);

  if (!kid.discoveryEnabled) {
    return <MyVideosView kidId={kidId} />;
  }

  const maxRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';
  const [allApproved, parentBlocklist, kidBlocklist, discovery] =
    await Promise.all([
      listApprovedVideosForKid(parent.id, kid.id),
      listBlocklistForParent(parent.id),
      listKidKeywords(parent.id, kid.id),
      listDiscoveryVideos({}, { maxRating }),
    ]);

  const approvedIdSet = new Set(allApproved.map((v) => v.youtubeVideoId));
  const discoveryFiltered = discovery.videos.filter((v) => {
    if (approvedIdSet.has(v.videoId)) return false;
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

  if (discoveryFiltered.length > 0) {
    return (
      <DiscoveryShelfClient
        kidId={kidId}
        initialVideos={discoveryFiltered}
        initialTokens={discovery.nextTokens}
        initialHasMore={discovery.hasMore}
      />
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recommended for you
      </h2>
      <p className="text-sm text-muted-foreground">
        {discovery.videos.length === 0
          ? 'No recommendations available right now.'
          : 'All recommendations were filtered out by your viewing rules.'}
      </p>
    </section>
  );
}
