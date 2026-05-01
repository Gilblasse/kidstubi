'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getActiveKidId } from '@/lib/auth/activeKid';
import { getParentByClerkId } from '@/db/queries/parents';
import { getKidProfileByIdForParent } from '@/db/queries/kidProfiles';
import { insertPendingApproval } from '@/db/queries/approvals';

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
  await insertPendingApproval({
    kidProfileId: kid.id,
    youtubeVideoId: videoId,
    source: 'kid_search_request',
  });
  revalidatePath(`/k/${kid.id}`);
  revalidatePath(`/k/${kid.id}/search`);
}
