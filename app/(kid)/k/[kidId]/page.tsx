import Image from 'next/image';
import { requireKidContext } from '@/lib/kid/context';
import { listApprovedVideosForKid } from '@/db/queries/videos';
import { listApprovedChannelsForKid } from '@/db/queries/channels';
import { listPendingApprovalsForKid } from '@/db/queries/approvals';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { listKidKeywords } from '@/db/queries/viewingRules';
import {
  listDiscoveryVideos,
  listVideoMetadata,
  type DiscoveryPage,
} from '@/lib/youtube/videos';
import { isMaxContentRating, isVideoAllowed } from '@/lib/kid/viewingRules';
import { VideoCard } from '@/components/kid/VideoCard';
import { DiscoveryShelfClient } from '@/components/kid/DiscoveryShelfClient';

export default async function KidHomePage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireKidContext(kidId);
  const [
    videos,
    channels,
    pending,
    parentBlocklist,
    kidBlocklist,
    discovery,
  ] = await Promise.all([
    listApprovedVideosForKid(parent.id, kid.id),
    listApprovedChannelsForKid(parent.id, kid.id),
    listPendingApprovalsForKid(parent.id, kid.id, 'kid_search_request'),
    kid.discoveryEnabled
      ? listBlocklistForParent(parent.id)
      : Promise.resolve([]),
    kid.discoveryEnabled
      ? listKidKeywords(parent.id, kid.id)
      : Promise.resolve([]),
    kid.discoveryEnabled
      ? listDiscoveryVideos()
      : Promise.resolve<DiscoveryPage>({
          videos: [],
          nextTokens: {},
          hasMore: false,
        }),
  ]);
  const channelTitleById = new Map(
    channels.map((c) => [c.youtubeChannelId, c.channelTitle]),
  );
  const pendingMeta = await listVideoMetadata(pending.map((p) => p.youtubeVideoId));
  const pendingMetaById = new Map(pendingMeta.map((m) => [m.videoId, m]));

  const maxRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';
  const approvedIdSet = new Set(videos.map((v) => v.youtubeVideoId));
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

  if (
    videos.length === 0 &&
    pending.length === 0 &&
    discoveryFiltered.length === 0
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-center text-lg text-muted-foreground">
          Ask a grown-up to add some channels!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Waiting for a grown-up
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pending.map((p) => {
              const meta = pendingMetaById.get(p.youtubeVideoId);
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-2"
                >
                  <div
                    className="relative aspect-video overflow-hidden rounded-md bg-muted"
                    aria-label="Not playable until a grown-up approves"
                  >
                    {meta?.thumbnailUrl ? (
                      <Image
                        src={meta.thumbnailUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                      Waiting for a grown-up
                    </div>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                    {meta?.title ?? p.youtubeVideoId}
                  </h3>
                  {meta?.channelTitle ? (
                    <p className="text-xs text-muted-foreground">
                      {meta.channelTitle}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {videos.length > 0 && (
        <section>
          {(pending.length > 0 || discoveryFiltered.length > 0) && (
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Your videos
            </h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                kidId={kidId}
                video={video}
                channelTitle={channelTitleById.get(video.channelId)}
              />
            ))}
          </div>
        </section>
      )}
      {kid.discoveryEnabled && discoveryFiltered.length > 0 && (
        <DiscoveryShelfClient
          kidId={kidId}
          initialVideos={discoveryFiltered}
          initialTokens={discovery.nextTokens}
          initialHasMore={discovery.hasMore}
        />
      )}
      {kid.discoveryEnabled && discoveryFiltered.length === 0 && (
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
      )}
    </div>
  );
}
