import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kid/context';
import { listPendingApprovalsForKid } from '@/db/queries/approvals';
import { runKidSearch } from '@/lib/kid/search';
import { SearchResultCard } from '@/components/kid/SearchResultCard';

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
  if (!kid.searchEnabled) redirect(`/k/${kidId}`);

  const query = q?.trim() ?? '';
  if (!query) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Type something to search.
        </p>
      </div>
    );
  }

  const filtered = await runKidSearch(parent, kid, query);
  const pending = await listPendingApprovalsForKid(parent.id, kid.id);
  const requestedIds = new Set(pending.map((p) => p.youtubeVideoId));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {filtered.length === 0
          ? 'No results.'
          : `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'} — tap one to ask a grown-up.`}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <SearchResultCard
            key={r.videoId}
            result={r}
            alreadyRequested={requestedIds.has(r.videoId)}
          />
        ))}
      </div>
    </div>
  );
}
