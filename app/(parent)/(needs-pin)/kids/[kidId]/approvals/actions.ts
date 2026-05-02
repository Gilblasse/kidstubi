'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import { resolvePendingApproval } from '@/db/queries/approvals';
import { bulkInsertApprovedVideos } from '@/db/queries/videos';
import { getVideoMetadata } from '@/lib/youtube/videos';
import { normalizeRating } from '@/lib/kid/viewingRules';

const schema = z.object({
  kidId: z.string().uuid(),
  pendingId: z.string().uuid(),
  videoId: z.string().min(1).max(64),
});

export async function approvePendingAction(formData: FormData) {
  const { kidId, pendingId, videoId } = schema.parse({
    kidId: formData.get('kidId'),
    pendingId: formData.get('pendingId'),
    videoId: formData.get('videoId'),
  });
  const { parent, kid } = await requireParentKid(kidId);
  const meta = await getVideoMetadata(videoId);
  if (!meta) {
    redirect(
      `/kids/${kidId}/approvals?error=${encodeURIComponent('Video unavailable on YouTube — cannot approve')}`,
    );
  }
  await bulkInsertApprovedVideos(parent.id, kid.id, [
    {
      youtubeVideoId: meta.videoId,
      channelId: meta.channelId,
      title: meta.title,
      thumbnailUrl: meta.thumbnailUrl,
      durationSeconds: meta.durationSeconds,
      contentRating: normalizeRating(meta.rating),
      madeForKids: meta.rating.madeForKids ?? null,
    },
  ]);
  await resolvePendingApproval(parent.id, pendingId, 'approved');
  revalidatePath(`/kids/${kidId}/approvals`);
  revalidatePath(`/kids/${kidId}/channels`);
}

const rejectSchema = z.object({
  kidId: z.string().uuid(),
  pendingId: z.string().uuid(),
});

export async function rejectPendingAction(formData: FormData) {
  const { kidId, pendingId } = rejectSchema.parse({
    kidId: formData.get('kidId'),
    pendingId: formData.get('pendingId'),
  });
  const { parent } = await requireParentKid(kidId);
  await resolvePendingApproval(parent.id, pendingId, 'rejected');
  revalidatePath(`/kids/${kidId}/approvals`);
}
