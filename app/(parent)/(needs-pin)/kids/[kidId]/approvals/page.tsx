import Image from 'next/image';
import Link from 'next/link';
import { requireParentKid } from '@/lib/parent/context';
import {
  listPendingApprovalsForKid,
  PENDING_APPROVAL_SOURCES,
  type PendingApprovalSource,
} from '@/db/queries/approvals';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAgo } from '@/lib/format';
import { listVideoMetadata } from '@/lib/youtube/videos';
import { approvePendingAction, rejectPendingAction } from './actions';

const SOURCE_LABEL: Record<PendingApprovalSource, string> = {
  channel_upload: 'New upload from a subscribed channel',
  kid_search_request: 'Kid asked for this from search',
};

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ kidId: string }>;
  searchParams: Promise<{ source?: string; error?: string }>;
}) {
  const { kidId } = await params;
  const { source, error } = await searchParams;
  const filter =
    source && (PENDING_APPROVAL_SOURCES as readonly string[]).includes(source)
      ? (source as PendingApprovalSource)
      : undefined;
  const { parent, kid } = await requireParentKid(kidId);
  const pending = await listPendingApprovalsForKid(parent.id, kid.id, filter);
  const metaList = await listVideoMetadata(pending.map((p) => p.youtubeVideoId));
  const metaById = new Map(metaList.map((m) => [m.videoId, m]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Approvals for {kid.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} waiting.
          </p>
        </div>
        <nav className="flex gap-1 text-xs">
          <Link
            href={`/kids/${kidId}/approvals`}
            className={buttonVariants({
              variant: filter ? 'ghost' : 'outline',
              size: 'sm',
            })}
          >
            All
          </Link>
          {PENDING_APPROVAL_SOURCES.map((s) => (
            <Link
              key={s}
              href={`/kids/${kidId}/approvals?source=${s}`}
              className={buttonVariants({
                variant: filter === s ? 'outline' : 'ghost',
                size: 'sm',
              })}
            >
              {s === 'channel_upload' ? 'Uploads' : 'Search'}
            </Link>
          ))}
        </nav>
      </header>

      {error && (
        <div
          className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Inbox zero. Nothing to review.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => {
            const meta = metaById.get(p.youtubeVideoId);
            return (
              <li key={p.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {SOURCE_LABEL[p.source as PendingApprovalSource] ?? p.source}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-start gap-4">
                    {meta?.thumbnailUrl ? (
                      <a
                        href={`https://www.youtube.com/watch?v=${p.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-md bg-muted"
                      >
                        <Image
                          src={meta.thumbnailUrl}
                          alt=""
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      </a>
                    ) : (
                      <div className="aspect-video w-40 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium leading-snug">
                        {meta?.title ?? p.youtubeVideoId}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {meta?.channelTitle ?? '—'}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Requested {formatTimeAgo(p.requestedAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <form action={rejectPendingAction}>
                        <input type="hidden" name="kidId" value={kid.id} />
                        <input type="hidden" name="pendingId" value={p.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Reject
                        </Button>
                      </form>
                      <form action={approvePendingAction}>
                        <input type="hidden" name="kidId" value={kid.id} />
                        <input type="hidden" name="pendingId" value={p.id} />
                        <input type="hidden" name="videoId" value={p.youtubeVideoId} />
                        <Button type="submit" size="sm">
                          Approve
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
