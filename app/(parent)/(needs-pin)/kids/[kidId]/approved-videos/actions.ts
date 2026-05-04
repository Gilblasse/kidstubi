'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import {
  deleteApprovedVideosByIds,
  updateApprovedVideoVisibility,
} from '@/db/queries/videos';

const visibilitySchema = z.object({
  kidId: z.string().uuid(),
  videoId: z.string().min(1).max(64),
  days: z.array(z.coerce.number().int().min(0).max(6)).max(7),
});

export async function updateVisibilityAction(formData: FormData) {
  const { kidId, videoId, days } = visibilitySchema.parse({
    kidId: formData.get('kidId'),
    videoId: formData.get('videoId'),
    days: formData.getAll('day'),
  });
  const { parent, kid } = await requireParentKid(kidId);
  await updateApprovedVideoVisibility(parent.id, kid.id, videoId, days);
  revalidatePath(`/kids/${kidId}/approved-videos`);
}

const removeSchema = z.object({
  kidId: z.string().uuid(),
  videoId: z.string().min(1).max(64),
});

export async function removeApprovalAction(formData: FormData) {
  const { kidId, videoId } = removeSchema.parse({
    kidId: formData.get('kidId'),
    videoId: formData.get('videoId'),
  });
  const { parent, kid } = await requireParentKid(kidId);
  await deleteApprovedVideosByIds(parent.id, kid.id, [videoId]);
  revalidatePath(`/kids/${kidId}/approved-videos`);
  revalidatePath(`/kids/${kidId}/channels`);
}
