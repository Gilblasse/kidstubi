import Link from 'next/link';
import { requireKidContext } from '@/lib/kid/context';
import { listApprovedChannelsForKid } from '@/db/queries/channels';

export default async function KidSubscriptionsPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireKidContext(kidId);
  const channels = await listApprovedChannelsForKid(parent.id, kid.id);

  if (channels.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-center text-lg text-muted-foreground">
          Ask a grown-up to add some channels!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="mb-4 text-2xl font-semibold">Subscriptions</h1>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((c) => (
          <li key={c.id}>
            <Link
              href={`/k/${kidId}/channel/${c.youtubeChannelId}`}
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                {c.channelTitle.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{c.channelTitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
