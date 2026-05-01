import { requireKidContext } from '@/lib/kid/context';
import { listWatchHistoryForKid } from '@/db/queries/history';
import { formatTimeAgo } from '@/lib/format';
import { listVideoMetadata } from '@/lib/youtube/videos';

export default async function KidHistoryPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireKidContext(kidId);
  const entries = await listWatchHistoryForKid(parent.id, kid.id);

  if (entries.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-center text-lg text-muted-foreground">
          You haven&apos;t watched anything yet.
        </p>
      </div>
    );
  }

  const metaList = await listVideoMetadata(entries.map((e) => e.youtubeVideoId));
  const titleById = new Map(metaList.map((m) => [m.videoId, m.title]));

  return (
    <div className="space-y-2">
      <h1 className="mb-4 text-2xl font-semibold">History</h1>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-border p-3 text-sm"
          >
            <div className="font-medium">
              {titleById.get(e.youtubeVideoId) ?? e.youtubeVideoId}
            </div>
            <div className="text-muted-foreground">
              Watched {formatTimeAgo(e.watchedAt)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
