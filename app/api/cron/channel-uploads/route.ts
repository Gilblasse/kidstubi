import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron/auth';
import { listAllApprovedChannelsAcrossTenants } from '@/db/queries/channels';
import { getChannelByIdOrUrl, listChannelVideos } from '@/lib/youtube/channels';
import { insertPendingApproval } from '@/db/queries/approvals';
import { getDb } from '@/db/client';
import { kidProfiles, parents } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { send } from '@/lib/notifications';

const LOOKBACK_DAYS = 7;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const channels = await listAllApprovedChannelsAcrossTenants();
  const grouped = new Map<string, Set<string>>();
  for (const c of channels) {
    const set = grouped.get(c.youtubeChannelId) ?? new Set();
    set.add(c.kidProfileId);
    grouped.set(c.youtubeChannelId, set);
  }

  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  let inserted = 0;
  let scannedChannels = 0;
  const insertsByKid = new Map<string, number>();

  for (const [youtubeChannelId, kidIds] of grouped) {
    scannedChannels++;
    const channelMeta = await getChannelByIdOrUrl(youtubeChannelId);
    if (!channelMeta) continue;
    const page = await listChannelVideos(channelMeta.uploadsPlaylistId);
    for (const video of page.videos) {
      const publishedAt = new Date(video.publishedAt);
      if (publishedAt < cutoff) continue;
      for (const kidProfileId of kidIds) {
        const row = await insertPendingApproval({
          kidProfileId,
          youtubeVideoId: video.videoId,
          source: 'channel_upload',
        });
        if (row) {
          inserted++;
          insertsByKid.set(kidProfileId, (insertsByKid.get(kidProfileId) ?? 0) + 1);
        }
      }
    }
  }

  if (insertsByKid.size > 0) {
    const kidIds = Array.from(insertsByKid.keys());
    const kidRows = await getDb()
      .select({
        kidId: kidProfiles.id,
        kidName: kidProfiles.displayName,
        parentId: parents.id,
        parentEmail: parents.email,
      })
      .from(kidProfiles)
      .innerJoin(parents, eq(kidProfiles.parentId, parents.id))
      .where(inArray(kidProfiles.id, kidIds));
    for (const row of kidRows) {
      const count = insertsByKid.get(row.kidId) ?? 0;
      if (count === 0) continue;
      await send({
        parentId: row.parentId,
        parentEmail: row.parentEmail,
        kind: 'channel_upload',
        title: `New uploads for ${row.kidName}`,
        body: `${count} new ${count === 1 ? 'video' : 'videos'} from a subscribed channel.`,
        href: `/kids/${row.kidId}/approvals?source=channel_upload`,
      });
    }
  }

  return NextResponse.json({ ok: true, scannedChannels, inserted });
}
