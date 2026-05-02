import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kid/context';
import { getApprovedVideo } from '@/db/queries/videos';
import { listApprovedChannelsForKid } from '@/db/queries/channels';
import { computeRemainingSecondsForKid } from '@/db/queries/screenTime';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import {
  listKidKeywords,
  updateApprovedVideoRatingCache,
} from '@/db/queries/viewingRules';
import {
  getVideoMetadata,
  listChannelRailVideos,
} from '@/lib/youtube/videos';
import {
  isAllowedTier,
  isMaxContentRating,
  isVideoAllowed,
  normalizeRating,
  type RatingSignal,
} from '@/lib/kid/viewingRules';
import { formatDuration, formatTimeAgo } from '@/lib/format';
import { WatchPlayer } from '@/components/kid/WatchPlayer';
import { WatchSessionGuard } from '@/components/kid/WatchSessionGuard';
import { buttonVariants } from '@/components/ui/button';

function titleHasBlockedKeyword(
  title: string,
  parentKeywords: string[],
  kidKeywords: string[],
): boolean {
  const lower = title.toLowerCase();
  return [...parentKeywords, ...kidKeywords].some((k) => lower.includes(k));
}

export default async function KidWatchPage({
  params,
}: {
  params: Promise<{ kidId: string; videoId: string }>;
}) {
  const { kidId, videoId } = await params;
  const { parent, kid } = await requireKidContext(kidId);
  const approved = await getApprovedVideo(parent.id, kid.id, videoId);

  let title: string;
  let channelId: string;
  let approvedAt: Date | null;
  let cachedTier: string | null;
  let madeForKids: boolean | null;
  let resolvedChannelTitle: string | null = null;

  if (approved) {
    title = approved.title;
    channelId = approved.channelId;
    approvedAt = approved.approvedAt;
    cachedTier = approved.contentRating;
    madeForKids = approved.madeForKids;
    if (cachedTier === null && madeForKids === null) {
      const meta = await getVideoMetadata(approved.youtubeVideoId);
      if (meta) {
        const tier = normalizeRating(meta.rating);
        cachedTier = tier;
        madeForKids = meta.rating.madeForKids ?? null;
        await updateApprovedVideoRatingCache(parent.id, kid.id, approved.youtubeVideoId, {
          contentRating: tier,
          madeForKids: madeForKids,
        });
      }
    }
  } else {
    if (!kid.discoveryEnabled) notFound();
    const meta = await getVideoMetadata(videoId);
    if (!meta) notFound();
    title = meta.title;
    channelId = meta.channelId;
    resolvedChannelTitle = meta.channelTitle;
    approvedAt = null;
    cachedTier = normalizeRating(meta.rating);
    madeForKids = meta.rating.madeForKids ?? null;
  }

  const { remainingSeconds } = await computeRemainingSecondsForKid(
    parent.id,
    kid.id,
  );
  if (remainingSeconds <= 0) redirect(`/k/${kidId}/locked`);

  const maxRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';

  const isApproved = approved !== null;
  const tierForCheck = isMaxContentRating(cachedTier)
    ? cachedTier
    : normalizeRating({ madeForKids } as RatingSignal);
  const tierAllowed = isApproved || isAllowedTier(tierForCheck, maxRating);

  const [parentBlocklist, kidBlocklist] = await Promise.all([
    listBlocklistForParent(parent.id),
    listKidKeywords(parent.id, kid.id),
  ]);
  const keywordBlocked = titleHasBlockedKeyword(
    title,
    parentBlocklist.map((b) => b.keyword),
    kidBlocklist.map((b) => b.keyword),
  );

  if (!tierAllowed || keywordBlocked) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold">This video isn&apos;t available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It doesn&apos;t meet your viewing rules. Ask a parent if you&apos;d like to watch it.
          </p>
          <Link
            href={`/k/${kidId}`}
            className={`mt-4 inline-flex ${buttonVariants({ variant: 'outline', size: 'sm' })}`}
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const channels = await listApprovedChannelsForKid(parent.id, kid.id);
  const channel = channels.find((c) => c.youtubeChannelId === channelId);
  const channelLabel = channel?.channelTitle ?? resolvedChannelTitle;

  const railVideos = kid.discoveryEnabled
    ? await listChannelRailVideos(channelId).catch(() => [])
    : [];
  const railFiltered = railVideos.filter((v) => {
    if (v.videoId === videoId) return false;
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <WatchPlayer videoId={videoId} title={title} />
      <WatchSessionGuard kidId={kidId} videoId={videoId} />
      <div>
        <h1 className="text-xl font-semibold leading-snug">{title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          {channel ? (
            <Link
              href={`/k/${kidId}/channel/${channel.youtubeChannelId}`}
              className="font-medium text-foreground hover:underline"
            >
              {channel.channelTitle}
            </Link>
          ) : (
            <span className="font-medium text-foreground">
              {channelLabel ?? 'Unknown channel'}
            </span>
          )}
          <span>·</span>
          <span>{approvedAt ? `Approved ${formatTimeAgo(approvedAt)}` : 'From YouTube'}</span>
        </div>
      </div>
      {railFiltered.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            More from {channelLabel ?? 'this channel'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {railFiltered.map((v) => (
              <Link
                key={v.videoId}
                href={`/k/${kidId}/watch/${v.videoId}`}
                className="group flex flex-col gap-2"
              >
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  {v.thumbnailUrl ? (
                    <Image
                      src={v.thumbnailUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : null}
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                    {formatDuration(v.durationSeconds)}
                  </span>
                </div>
                <div>
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                    {v.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {v.channelTitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
