import Link from 'next/link';
import Image from 'next/image';
import { formatDuration, formatTimeAgo } from '@/lib/format';
import type { ApprovedVideo } from '@/db/schema';

export function VideoCard({
  kidId,
  video,
  channelTitle,
}: {
  kidId: string;
  video: ApprovedVideo;
  channelTitle?: string;
}) {
  return (
    <Link
      href={`/k/${kidId}/watch/${video.youtubeVideoId}`}
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        ) : null}
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {video.title}
        </h3>
        {channelTitle && (
          <p className="mt-1 text-xs text-muted-foreground">{channelTitle}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatTimeAgo(video.approvedAt)}
        </p>
      </div>
    </Link>
  );
}
