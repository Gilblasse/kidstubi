import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireParentKid } from '@/lib/parent/context';
import { getChannelByIdOrUrl, listChannelVideos } from '@/lib/youtube/channels';
import { listVideoMetadata } from '@/lib/youtube/videos';
import { listApprovedVideosForChannel } from '@/db/queries/videos';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { listKidKeywords } from '@/db/queries/viewingRules';
import { isMaxContentRating, isVideoAllowed } from '@/lib/kid/viewingRules';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SaveButton } from '@/components/parent/SaveButton';
import { SelectAllCheckbox } from '@/components/parent/SelectAllCheckbox';
import { formatDuration, formatTimeAgo } from '@/lib/format';
import { submitReviewAction } from './actions';

export default async function ChannelReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ kidId: string; channelId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { kidId, channelId } = await params;
  const { page } = await searchParams;
  const { parent, kid } = await requireParentKid(kidId);

  const channel = await getChannelByIdOrUrl(channelId);
  if (!channel) notFound();

  const videosPage = await listChannelVideos(
    channel.uploadsPlaylistId,
    page ?? undefined,
  );
  const [existingApproved, parentBlocklist, kidBlocklist, ratingMeta] = await Promise.all([
    listApprovedVideosForChannel(parent.id, kid.id, channel.channelId),
    listBlocklistForParent(parent.id),
    listKidKeywords(parent.id, kid.id),
    videosPage.videos.length > 0
      ? listVideoMetadata(videosPage.videos.map((v) => v.videoId))
      : Promise.resolve([]),
  ]);
  const approvedIds = new Set(existingApproved.map((v) => v.youtubeVideoId));
  const ratingByVideoId = new Map(ratingMeta.map((m) => [m.videoId, m.rating]));

  const maxRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';
  const rules = {
    maxRating,
    kidKeywords: kidBlocklist.map((b) => b.keyword),
    parentKeywords: parentBlocklist.map((b) => b.keyword),
  };

  const disallowedById = new Map<string, 'rating' | 'keyword'>();
  for (const v of videosPage.videos) {
    const decision = isVideoAllowed(
      {
        title: v.title,
        description: v.description,
        channelTitle: channel.title,
        rating: ratingByVideoId.get(v.videoId) ?? {},
      },
      rules,
    );
    if (!decision.allowed) disallowedById.set(v.videoId, decision.reason);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">{channel.title}</h1>
        <p className="text-sm text-muted-foreground">
          Reviewing for {kid.displayName}. Pre-checked items are already approved;
          unchecking one removes its approval. Select-All only applies to this page.
          Items blocked by viewing rules can't be approved.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Videos ({videosPage.totalResults} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitReviewAction} className="space-y-4">
            <input type="hidden" name="kidId" value={kid.id} />
            <input type="hidden" name="channelId" value={channel.channelId} />
            {videosPage.videos.map((v) => (
              <input
                key={v.videoId}
                type="hidden"
                name="pageVideoId"
                value={v.videoId}
              />
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <SelectAllCheckbox checkboxName="approve" />
              <SaveButton>Save approvals</SaveButton>
            </div>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {videosPage.videos.map((v) => {
                const isApproved = approvedIds.has(v.videoId);
                const blockedReason = disallowedById.get(v.videoId);
                return (
                  <li
                    key={v.videoId}
                    className={
                      'flex gap-3 rounded-lg border border-border p-3 ' +
                      (blockedReason ? 'opacity-60' : '')
                    }
                  >
                    <label className="flex flex-1 cursor-pointer gap-3">
                      <input
                        type="checkbox"
                        name="approve"
                        value={v.videoId}
                        defaultChecked={isApproved && !blockedReason}
                        disabled={!!blockedReason}
                        className="mt-1 h-4 w-4 rounded border-input disabled:cursor-not-allowed"
                      />
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded bg-muted">
                        {v.thumbnailUrl ? (
                          <Image
                            src={v.thumbnailUrl}
                            alt=""
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        ) : null}
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
                          {formatDuration(v.durationSeconds)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="line-clamp-2 text-sm font-medium">
                          {v.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatTimeAgo(v.publishedAt)}
                          {isApproved && ' · already approved'}
                        </div>
                        {blockedReason ? (
                          <div className="mt-1 inline-block rounded bg-destructive/15 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
                            Blocked: {blockedReason === 'rating' ? 'rating' : 'keyword'}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Link
                href={`/kids/${kidId}/channels`}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                Cancel
              </Link>
              {videosPage.nextPageToken && (
                <Link
                  href={`/kids/${kidId}/channels/${channelId}/review?page=${encodeURIComponent(
                    videosPage.nextPageToken,
                  )}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Next page →
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
