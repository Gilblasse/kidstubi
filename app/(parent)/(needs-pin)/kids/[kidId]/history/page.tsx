import { requireParentKid } from '@/lib/parent/context';
import { listWatchHistoryForKid } from '@/db/queries/history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { formatDuration, formatTimeAgo } from '@/lib/format';
import { listVideoMetadata } from '@/lib/youtube/videos';
import Link from 'next/link';
import type { WatchHistoryEntry } from '@/db/schema';

function groupByDay(entries: WatchHistoryEntry[]): Map<string, WatchHistoryEntry[]> {
  const map = new Map<string, WatchHistoryEntry[]>();
  for (const e of entries) {
    const key = new Date(e.watchedAt).toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return map;
}

export default async function ParentHistoryPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireParentKid(kidId);
  const entries = await listWatchHistoryForKid(parent.id, kid.id);
  const grouped = groupByDay(entries);
  const metaList = await listVideoMetadata(entries.map((e) => e.youtubeVideoId));
  const titleById = new Map(metaList.map((m) => [m.videoId, m.title]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          History for {kid.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {entries.length} watched {entries.length === 1 ? 'video' : 'videos'}.
        </p>
      </header>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing watched yet.
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([day, items]) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                {new Date(day).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {items.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {titleById.get(e.youtubeVideoId) ?? e.youtubeVideoId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(e.watchedAt)} ·{' '}
                        {formatDuration(e.secondsWatched)} watched
                      </div>
                    </div>
                    <Link
                      href={`https://www.youtube.com/watch?v=${e.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Replay
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
