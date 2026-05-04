import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  listApprovedChannelsForKid,
} from '@/db/queries/channels';
import { listApprovedVideosForKid } from '@/db/queries/videos';
import { requireParentKid } from '@/lib/parent/context';
import { formatTimeAgo } from '@/lib/format';
import { VideoPreview } from '@/components/parent/VideoPreview';
import { VisibilityPills } from '@/components/parent/VisibilityPills';
import { removeApprovalAction } from './actions';

export default async function ApprovedVideosPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireParentKid(kidId);
  const [videos, channels] = await Promise.all([
    listApprovedVideosForKid(parent.id, kid.id),
    listApprovedChannelsForKid(parent.id, kid.id),
  ]);
  const channelTitleById = new Map(
    channels.map((c) => [c.youtubeChannelId, c.channelTitle]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Approved videos for {kid.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Remove approval, or limit which days of the week each video is
          visible. Days are evaluated in UTC.
        </p>
      </header>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No approved videos yet.
            </p>
            <Link
              href={`/kids/${kid.id}/channels`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Add a channel
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {videos.map((v) => {
            const channelTitle =
              channelTitleById.get(v.channelId) ?? v.channelId;
            return (
              <li key={v.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-base font-medium">
                      {v.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <VideoPreview
                      videoId={v.youtubeVideoId}
                      title={v.title}
                      thumbnailUrl={v.thumbnailUrl}
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="text-xs text-muted-foreground">
                        {channelTitle} · Approved {formatTimeAgo(v.approvedAt)}
                      </div>
                      <VisibilityPills
                        kidId={kid.id}
                        videoId={v.youtubeVideoId}
                        initialDays={v.visibleDays}
                      />
                      <form action={removeApprovalAction}>
                        <input type="hidden" name="kidId" value={kid.id} />
                        <input
                          type="hidden"
                          name="videoId"
                          value={v.youtubeVideoId}
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          Remove approval
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
