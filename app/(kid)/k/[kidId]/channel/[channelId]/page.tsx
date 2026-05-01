import { notFound } from 'next/navigation';
import { requireKidContext } from '@/lib/kid/context';
import { listApprovedChannelsForKid } from '@/db/queries/channels';
import { listApprovedVideosForChannel } from '@/db/queries/videos';
import { VideoCard } from '@/components/kid/VideoCard';

export default async function KidChannelPage({
  params,
}: {
  params: Promise<{ kidId: string; channelId: string }>;
}) {
  const { kidId, channelId } = await params;
  const { parent, kid } = await requireKidContext(kidId);
  const channels = await listApprovedChannelsForKid(parent.id, kid.id);
  const channel = channels.find((c) => c.youtubeChannelId === channelId);
  if (!channel) notFound();
  const videos = await listApprovedVideosForChannel(parent.id, kid.id, channelId);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 border-b border-border pb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-semibold">
          {channel.channelTitle.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{channel.channelTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </p>
        </div>
      </header>
      {videos.length === 0 ? (
        <p className="text-muted-foreground">No videos approved yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              kidId={kidId}
              video={video}
              channelTitle={channel.channelTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
