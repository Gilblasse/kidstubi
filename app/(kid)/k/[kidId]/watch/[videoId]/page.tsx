import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kid/context';
import { getApprovedVideo } from '@/db/queries/videos';
import { listApprovedChannelsForKid } from '@/db/queries/channels';
import { computeRemainingSecondsForKid } from '@/db/queries/screenTime';
import { formatTimeAgo } from '@/lib/format';
import { WatchPlayer } from '@/components/kid/WatchPlayer';
import { WatchSessionGuard } from '@/components/kid/WatchSessionGuard';

export default async function KidWatchPage({
  params,
}: {
  params: Promise<{ kidId: string; videoId: string }>;
}) {
  const { kidId, videoId } = await params;
  const { parent, kid } = await requireKidContext(kidId);
  const video = await getApprovedVideo(parent.id, kid.id, videoId);
  if (!video) notFound();
  const { remainingSeconds } = await computeRemainingSecondsForKid(
    parent.id,
    kid.id,
  );
  if (remainingSeconds <= 0) redirect(`/k/${kidId}/locked`);
  const channels = await listApprovedChannelsForKid(parent.id, kid.id);
  const channel = channels.find((c) => c.youtubeChannelId === video.channelId);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <WatchPlayer videoId={video.youtubeVideoId} title={video.title} />
      <WatchSessionGuard kidId={kidId} videoId={video.youtubeVideoId} />
      <div>
        <h1 className="text-xl font-semibold leading-snug">{video.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          {channel ? (
            <Link
              href={`/k/${kidId}/channel/${channel.youtubeChannelId}`}
              className="font-medium text-foreground hover:underline"
            >
              {channel.channelTitle}
            </Link>
          ) : (
            <span className="font-medium text-foreground">Unknown channel</span>
          )}
          <span>·</span>
          <span>Approved {formatTimeAgo(video.approvedAt)}</span>
        </div>
      </div>
    </div>
  );
}
