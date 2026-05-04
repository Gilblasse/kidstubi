import Link from 'next/link';
import { requireParentKid } from '@/lib/parent/context';
import { listApprovedChannelsForKid } from '@/db/queries/channels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChannelTypeahead } from '@/components/parent/ChannelTypeahead';

type SearchParams = Promise<{ error?: string }>;

export default async function ChannelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ kidId: string }>;
  searchParams: SearchParams;
}) {
  const { kidId } = await params;
  const { error } = await searchParams;
  const { parent, kid } = await requireParentKid(kidId);
  const channels = await listApprovedChannelsForKid(parent.id, kid.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Channels for {kid.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {channels.length} approved {channels.length === 1 ? 'channel' : 'channels'}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add a channel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChannelTypeahead kidId={kid.id} />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved channels</CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No channels yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {channels.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/kids/${kid.id}/channels/${c.youtubeChannelId}/review`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-3 -mx-2 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-medium">{c.channelTitle}</span>
                    <span className="text-muted-foreground" aria-hidden>
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
