'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireParentKid, requireParent } from '@/lib/parent/context';
import { updateKidSearchSettings } from '@/db/queries/kidProfiles';
import {
  addBlocklistKeyword,
  removeBlocklistKeyword,
} from '@/db/queries/blocklist';

const settingsSchema = z.object({
  kidId: z.string().uuid(),
  searchEnabled: z.coerce.boolean().optional(),
  liveSearchAlerts: z.coerce.boolean().optional(),
});

export async function updateKidSearchSettingsAction(formData: FormData) {
  const { kidId, searchEnabled, liveSearchAlerts } = settingsSchema.parse({
    kidId: formData.get('kidId'),
    searchEnabled: formData.get('searchEnabled') === 'on',
    liveSearchAlerts: formData.get('liveSearchAlerts') === 'on',
  });
  const { parent, kid } = await requireParentKid(kidId);
  await updateKidSearchSettings(parent.id, kid.id, {
    searchEnabled,
    liveSearchAlerts,
  });
  revalidatePath(`/kids/${kidId}/search-history`);
}

const addSchema = z.object({ keyword: z.string().min(1).max(60) });

export async function addBlocklistAction(formData: FormData) {
  const parent = await requireParent();
  const { keyword } = addSchema.parse({ keyword: formData.get('keyword') });
  await addBlocklistKeyword(parent.id, keyword);
  revalidatePath('/settings/blocklist');
}

const removeSchema = z.object({ id: z.string().uuid() });

export async function removeBlocklistAction(formData: FormData) {
  const parent = await requireParent();
  const { id } = removeSchema.parse({ id: formData.get('id') });
  await removeBlocklistKeyword(parent.id, id);
  revalidatePath('/settings/blocklist');
}
