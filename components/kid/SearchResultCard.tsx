import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { requestApprovalAction } from '@/app/(kid)/k/[kidId]/search/actions';

export type SearchResult = {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
};

export function SearchResultCard({
  result,
  alreadyRequested,
}: {
  result: SearchResult;
  alreadyRequested: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
      <div
        className="relative aspect-video overflow-hidden rounded-md bg-muted"
        aria-label="Not playable until a grown-up approves"
      >
        {result.thumbnailUrl ? (
          <Image
            src={result.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
          Ask a grown-up
        </div>
      </div>
      <h3 className="line-clamp-2 text-sm font-medium leading-snug">
        {result.title}
      </h3>
      <p className="text-xs text-muted-foreground">{result.channelTitle}</p>
      <form action={requestApprovalAction}>
        <input type="hidden" name="videoId" value={result.videoId} />
        <Button type="submit" size="sm" disabled={alreadyRequested} className="w-full">
          {alreadyRequested ? 'Waiting for grown-up' : 'Ask to watch'}
        </Button>
      </form>
    </div>
  );
}
