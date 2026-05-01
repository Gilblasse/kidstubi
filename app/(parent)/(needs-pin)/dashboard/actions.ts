'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireParent } from '@/lib/parent/context';
import { createKidProfile, updateKidAvatar } from '@/db/queries/kidProfiles';
import { AVATAR_PRESETS, DEFAULT_AVATAR_KEY, avatarValue } from '@/lib/avatars';

const avatarKeys = AVATAR_PRESETS.map((p) => p.key) as [string, ...string[]];

const createSchema = z.object({
  displayName: z.string().min(1).max(40),
  avatarKey: z.enum(avatarKeys).optional(),
});

export async function createKidAction(formData: FormData) {
  const parent = await requireParent();
  const { displayName, avatarKey } = createSchema.parse({
    displayName: formData.get('displayName'),
    avatarKey: formData.get('avatarKey') ?? undefined,
  });
  await createKidProfile(parent.id, {
    displayName,
    avatarUrl: avatarValue(avatarKey ?? DEFAULT_AVATAR_KEY),
  });
  revalidatePath('/dashboard');
  revalidatePath('/profiles');
}

const updateAvatarSchema = z.object({
  kidProfileId: z.string().uuid(),
  avatarKey: z.enum(avatarKeys),
});

export async function updateKidAvatarAction(formData: FormData) {
  const parent = await requireParent();
  const { kidProfileId, avatarKey } = updateAvatarSchema.parse({
    kidProfileId: formData.get('kidProfileId'),
    avatarKey: formData.get('avatarKey'),
  });
  await updateKidAvatar(parent.id, kidProfileId, avatarValue(avatarKey));
  revalidatePath('/dashboard');
  revalidatePath('/profiles');
}
