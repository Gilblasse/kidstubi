'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getActiveKidId } from '@/lib/auth/activeKid';
import { getParentByClerkId } from '@/db/queries/parents';
import { getKidProfileByIdForParent } from '@/db/queries/kidProfiles';
import { insertPendingApproval } from '@/db/queries/approvals';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { listKidKeywords } from '@/db/queries/viewingRules';
import { getVideoMetadata } from '@/lib/youtube/videos';
import { isMaxContentRating, isVideoAllowed } from '@/lib/kid/viewingRules';

const schema = z.object({
  videoId: z.string().min(1).max(64),
});

export async function requestApprovalAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('unauthorized');
  const parent = await getParentByClerkId(userId);
  if (!parent) throw new Error('unauthorized');
  const activeKidId = await getActiveKidId();
  if (!activeKidId) throw new Error('no_active_kid');
  const kid = await getKidProfileByIdForParent(parent.id, activeKidId);
  if (!kid || !kid.searchEnabled) throw new Error('search_disabled');
  const { videoId } = schema.parse({ videoId: formData.get('videoId') });

  const meta = await getVideoMetadata(videoId);
  if (!meta) throw new Error('video_unavailable');
  const [parentBlocklist, kidBlocklist] = await Promise.all([
    listBlocklistForParent(parent.id),
    listKidKeywords(parent.id, kid.id),
  ]);
  const maxRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';
  const decision = isVideoAllowed(
    {
      title: meta.title,
      description: meta.description,
      channelTitle: meta.channelTitle,
      rating: meta.rating,
    },
    {
      maxRating,
      kidKeywords: kidBlocklist.map((b) => b.keyword),
      parentKeywords: parentBlocklist.map((b) => b.keyword),
    },
  );
  if (!decision.allowed) {
    throw new Error(`viewing_rules_${decision.reason}`);
  }

  await insertPendingApproval({
    kidProfileId: kid.id,
    youtubeVideoId: videoId,
    source: 'kid_search_request',
  });
  revalidatePath(`/k/${kid.id}`);
  revalidatePath(`/k/${kid.id}/search`);
}
