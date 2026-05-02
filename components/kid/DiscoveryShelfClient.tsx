'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/format';
import {
  loadMoreDiscoveryAction,
  type LoadMoreResult,
} from '@/app/(kid)/k/[kidId]/actions';
import type {
  DiscoveryPageTokens,
  VideoMetadata,
} from '@/lib/youtube/videos';

export function DiscoveryShelfClient({
  kidId,
  initialVideos,
  initialTokens,
  initialHasMore,
}: {
  kidId: string;
  initialVideos: VideoMetadata[];
  initialTokens: DiscoveryPageTokens;
  initialHasMore: boolean;
}) {
  const [videos, setVideos] = useState<VideoMetadata[]>(initialVideos);
  const [tokens, setTokens] = useState<DiscoveryPageTokens>(initialTokens);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const onLoadMore = () => {
    startTransition(async () => {
      const excludeIds = videos.map((v) => v.videoId);
      const result: LoadMoreResult = await loadMoreDiscoveryAction(
        kidId,
        tokens,
        excludeIds,
      );
      setVideos((prev) => [...prev, ...result.videos]);
      setTokens(result.nextTokens);
      setHasMore(result.hasMore);
    });
  };

  if (videos.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recommended for you
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((v) => (
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
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={isPending}
          >
            {isPending ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}
