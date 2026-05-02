import { requireKidContext } from '@/lib/kid/context';
import {
  listPendingApprovalsForKid,
} from '@/db/queries/approvals';
import { listApprovedVideosForKid } from '@/db/queries/videos';
import { listApprovedChannelsForKid } from '@/db/queries/channels';
import { runKidSearch } from '@/lib/kid/search';
import type { SearchResult } from '@/lib/youtube/search';
import { SearchResultCard } from '@/components/kid/SearchResultCard';
import { VideoCard } from '@/components/kid/VideoCard';

export default async function KidSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ kidId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { kidId } = await params;
  const { q } = await searchParams;
  const { parent, kid } = await requireKidContext(kidId);

  const query = q?.trim() ?? '';
  if (!query) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {kid.searchEnabled
            ? 'Type something to search.'
            : 'Type to search your approved videos.'}
        </p>
      </div>
    );
  }

  if (!kid.searchEnabled) {
    const [videos, channels] = await Promise.all([
      listApprovedVideosForKid(parent.id, kid.id),
      listApprovedChannelsForKid(parent.id, kid.id),
    ]);
    const channelTitleById = new Map(
      channels.map((c) => [c.youtubeChannelId, c.channelTitle]),
    );
    const needle = query.toLowerCase();
    const matches = videos.filter((v) => {
      const channelTitle = channelTitleById.get(v.channelId) ?? '';
      return (
        v.title.toLowerCase().includes(needle) ||
        channelTitle.toLowerCase().includes(needle)
      );
    });

    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {matches.length === 0
            ? 'No approved videos match that search.'
            : `${matches.length} ${matches.length === 1 ? 'video' : 'videos'} from your approved list.`}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {matches.map((video) => (
            <VideoCard
              key={video.id}
              kidId={kidId}
              video={video}
              channelTitle={channelTitleById.get(video.channelId)}
            />
          ))}
        </div>
      </div>
    );
  }

  const [filteredResult, pending, approvedVideos, approvedChannels] = await Promise.all([
    runKidSearch(parent, kid, query).then(
      (results): { ok: true; results: SearchResult[] } => ({ ok: true, results }),
      (err: unknown): { ok: false; reason: 'disabled' | 'unavailable' } => {
        if (err instanceof Error && err.message === 'search_disabled') {
          return { ok: false, reason: 'disabled' };
        }
        console.error('runKidSearch failed', err);
        return { ok: false, reason: 'unavailable' };
      },
    ),
    listPendingApprovalsForKid(parent.id, kid.id),
    listApprovedVideosForKid(parent.id, kid.id),
    listApprovedChannelsForKid(parent.id, kid.id),
  ]);
  const filtered = filteredResult.ok ? filteredResult.results : [];
  const remoteFailed = !filteredResult.ok && filteredResult.reason === 'unavailable';
  const requestedIds = new Set(pending.map((p) => p.youtubeVideoId));
  const channelTitleById = new Map(
    approvedChannels.map((c) => [c.youtubeChannelId, c.channelTitle]),
  );
  const needle = query.toLowerCase();
  const approvedMatches = approvedVideos.filter((v) => {
    const channelTitle = channelTitleById.get(v.channelId) ?? '';
    return (
      v.title.toLowerCase().includes(needle) ||
      channelTitle.toLowerCase().includes(needle)
    );
  });
  const approvedIds = new Set(approvedMatches.map((v) => v.youtubeVideoId));
  const remoteResults = filtered.filter((r) => !approvedIds.has(r.videoId));
  const totalCount = approvedMatches.length + remoteResults.length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {totalCount === 0
          ? remoteFailed
            ? 'Search is unavailable right now. No approved videos match either.'
            : 'No results.'
          : approvedMatches.length > 0 && remoteResults.length > 0
            ? `${approvedMatches.length} from your approved list, ${remoteResults.length} more — tap one to ask a grown-up.`
            : approvedMatches.length > 0
              ? remoteFailed
                ? `${approvedMatches.length} ${approvedMatches.length === 1 ? 'video' : 'videos'} from your approved list. (Search is unavailable right now.)`
                : `${approvedMatches.length} ${approvedMatches.length === 1 ? 'video' : 'videos'} from your approved list.`
              : `${remoteResults.length} ${remoteResults.length === 1 ? 'result' : 'results'} — tap one to ask a grown-up.`}
      </p>
      {approvedMatches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {approvedMatches.map((video) => (
            <VideoCard
              key={video.id}
              kidId={kidId}
              video={video}
              channelTitle={channelTitleById.get(video.channelId)}
            />
          ))}
        </div>
      )}
      {remoteResults.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {remoteResults.map((r) => (
            <SearchResultCard
              key={r.videoId}
              result={r}
              alreadyRequested={requestedIds.has(r.videoId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
