'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import { getChannelByIdOrUrl, listChannelVideos } from '@/lib/youtube/channels';
import { listVideoMetadata } from '@/lib/youtube/videos';
import { addApprovedChannel, listApprovedChannelsForKid } from '@/db/queries/channels';
import {
  bulkInsertApprovedVideos,
  deleteApprovedVideosByIds,
  listApprovedVideosForChannel,
} from '@/db/queries/videos';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { listKidKeywords } from '@/db/queries/viewingRules';
import {
  isMaxContentRating,
  isVideoAllowed,
  normalizeRating,
} from '@/lib/kid/viewingRules';

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
  const pageVideoIds = formData.getAll('pageVideoId').map(String);

  const existingChannels = await listApprovedChannelsForKid(parent.id, kid.id);
  const alreadyApproved = existingChannels.some(
    (c) => c.youtubeChannelId === channel.channelId,
  );
  if (!alreadyApproved && checkedIds.length > 0) {
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

  const checkedSet = new Set(checkedIds);
  const toRemove = pageVideoIds.filter(
    (id) => existingVideoIds.has(id) && !checkedSet.has(id),
  );
  if (toRemove.length > 0) {
    await deleteApprovedVideosByIds(parent.id, kid.id, toRemove);
  }

  const newIdsToInsert = checkedIds.filter((id) => !existingVideoIds.has(id));
  if (newIdsToInsert.length > 0) {
    let pageToken: string | undefined;
    const detailsByVideoId = new Map<
      string,
      { title: string; description: string; thumbnailUrl: string; durationSeconds: number }
    >();
    do {
      const page = await listChannelVideos(channel.uploadsPlaylistId, pageToken);
      for (const v of page.videos) {
        detailsByVideoId.set(v.videoId, {
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          durationSeconds: v.durationSeconds,
        });
      }
      pageToken = page.nextPageToken ?? undefined;
      if (newIdsToInsert.every((id) => detailsByVideoId.has(id))) {
        break;
      }
    } while (pageToken);

    const ratingMeta = await listVideoMetadata(newIdsToInsert);
    const ratingByVideoId = new Map(ratingMeta.map((m) => [m.videoId, m.rating]));

    const [parentBlocklist, kidBlocklist] = await Promise.all([
      listBlocklistForParent(parent.id),
      listKidKeywords(parent.id, kid.id),
    ]);
    const maxRating = isMaxContentRating(kid.maxContentRating)
      ? kid.maxContentRating
      : 'tv_g';
    const rules = {
      maxRating,
      kidKeywords: kidBlocklist.map((b) => b.keyword),
      parentKeywords: parentBlocklist.map((b) => b.keyword),
    };

    const toInsert = newIdsToInsert
      .filter((id) => detailsByVideoId.has(id))
      .filter((id) => {
        const d = detailsByVideoId.get(id)!;
        const rating = ratingByVideoId.get(id) ?? {};
        return isVideoAllowed(
          {
            title: d.title,
            description: d.description,
            channelTitle: channel.title,
            rating,
          },
          rules,
        ).allowed;
      })
      .map((id) => {
        const d = detailsByVideoId.get(id)!;
        const rating = ratingByVideoId.get(id) ?? {};
        return {
          youtubeVideoId: id,
          channelId: channel.channelId,
          title: d.title,
          thumbnailUrl: d.thumbnailUrl,
          durationSeconds: d.durationSeconds,
          contentRating: normalizeRating(rating),
          madeForKids: rating.madeForKids ?? null,
        };
      });

    if (toInsert.length > 0) {
      await bulkInsertApprovedVideos(parent.id, kid.id, toInsert);
    }
  }

  redirect(`/kids/${kidId}/channels`);
}
