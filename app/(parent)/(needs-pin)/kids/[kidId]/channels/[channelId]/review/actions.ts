'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import { getChannelByIdOrUrl, listChannelVideos } from '@/lib/youtube/channels';
import { addApprovedChannel, listApprovedChannelsForKid } from '@/db/queries/channels';
import {
  bulkInsertApprovedVideos,
  listApprovedVideosForChannel,
} from '@/db/queries/videos';

const schema = z.object({
  kidId: z.string().uuid(),
  channelId: z.string().min(1),
});

export async function submitReviewAction(formData: FormData) {
  const { kidId, channelId } = schema.parse({
    kidId: formData.get('kidId'),
    channelId: formData.get('channelId'),
  });
  const { parent, kid } = await requireParentKid(kidId);

  const channel = await getChannelByIdOrUrl(channelId);
  if (!channel) redirect(`/kids/${kidId}/channels?error=${encodeURIComponent('Channel not found')}`);

  const checkedIds = formData.getAll('approve').map(String);
  if (checkedIds.length === 0) {
    redirect(`/kids/${kidId}/channels`);
  }

  const existingChannels = await listApprovedChannelsForKid(parent.id, kid.id);
  const alreadyApproved = existingChannels.some(
    (c) => c.youtubeChannelId === channel.channelId,
  );
  if (!alreadyApproved) {
    await addApprovedChannel(parent.id, kid.id, {
      youtubeChannelId: channel.channelId,
      channelTitle: channel.title,
    });
  }

  const existingVideos = await listApprovedVideosForChannel(
    parent.id,
    kid.id,
    channel.channelId,
  );
  const existingVideoIds = new Set(existingVideos.map((v) => v.youtubeVideoId));

  let pageToken: string | undefined;
  const detailsByVideoId = new Map<
    string,
    { title: string; thumbnailUrl: string; durationSeconds: number }
  >();
  do {
    const page = await listChannelVideos(channel.uploadsPlaylistId, pageToken);
    for (const v of page.videos) {
      detailsByVideoId.set(v.videoId, {
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
      });
    }
    pageToken = page.nextPageToken ?? undefined;
    if (checkedIds.every((id) => detailsByVideoId.has(id))) {
      break;
    }
  } while (pageToken);

  const toInsert = checkedIds
    .filter((id) => !existingVideoIds.has(id) && detailsByVideoId.has(id))
    .map((id) => {
      const d = detailsByVideoId.get(id)!;
      return {
        youtubeVideoId: id,
        channelId: channel.channelId,
        title: d.title,
        thumbnailUrl: d.thumbnailUrl,
        durationSeconds: d.durationSeconds,
      };
    });

  if (toInsert.length > 0) {
    await bulkInsertApprovedVideos(parent.id, kid.id, toInsert);
  }

  redirect(`/kids/${kidId}/channels`);
}
