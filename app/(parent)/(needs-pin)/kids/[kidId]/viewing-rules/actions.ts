'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import {
  addKidKeyword,
  removeKidKeyword,
  updateKidDiscoveryEnabled,
  updateKidMaxRating,
} from '@/db/queries/viewingRules';
import { MAX_CONTENT_RATINGS } from '@/db/schema';

const ratingSchema = z.object({
  kidId: z.string().uuid(),
  maxContentRating: z.enum(MAX_CONTENT_RATINGS),
});

export async function updateKidViewingRulesAction(formData: FormData) {
  const { kidId, maxContentRating } = ratingSchema.parse({
    kidId: formData.get('kidId'),
    maxContentRating: formData.get('maxContentRating'),
  });
  const { parent, kid } = await requireParentKid(kidId);
  await updateKidMaxRating(parent.id, kid.id, maxContentRating);
  revalidatePath(`/kids/${kidId}/viewing-rules`);
}

const discoverySchema = z.object({
  kidId: z.string().uuid(),
  enabled: z.enum(['true', 'false']),
});

export async function updateKidDiscoveryEnabledAction(formData: FormData) {
  const { kidId, enabled } = discoverySchema.parse({
    kidId: formData.get('kidId'),
    enabled: formData.get('enabled'),
  });
  const { parent, kid } = await requireParentKid(kidId);
  await updateKidDiscoveryEnabled(parent.id, kid.id, enabled === 'true');
  revalidatePath(`/kids/${kidId}/viewing-rules`);
}

const addKeywordSchema = z.object({
  kidId: z.string().uuid(),
  keyword: z.string().min(1).max(60),
});

export async function addKidKeywordAction(formData: FormData) {
  const { kidId, keyword } = addKeywordSchema.parse({
    kidId: formData.get('kidId'),
    keyword: formData.get('keyword'),
  });
  const { parent, kid } = await requireParentKid(kidId);
  await addKidKeyword(parent.id, kid.id, keyword);
  revalidatePath(`/kids/${kidId}/viewing-rules`);
}

const removeKeywordSchema = z.object({
  kidId: z.string().uuid(),
  id: z.string().uuid(),
});

export async function removeKidKeywordAction(formData: FormData) {
  const { kidId, id } = removeKeywordSchema.parse({
    kidId: formData.get('kidId'),
    id: formData.get('id'),
  });
  const { parent, kid } = await requireParentKid(kidId);
  await removeKidKeyword(parent.id, kid.id, id);
  revalidatePath(`/kids/${kidId}/viewing-rules`);
}
