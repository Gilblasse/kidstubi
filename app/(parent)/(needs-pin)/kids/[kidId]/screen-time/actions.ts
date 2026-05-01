'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import { upsertScreenTimeRules } from '@/db/queries/screenTime';

const schema = z.object({
  kidId: z.string().uuid(),
  minutes: z.array(z.coerce.number().int().min(0).max(24 * 60)).length(7),
});

export async function updateScreenTimeRulesAction(formData: FormData) {
  const minutesRaw = [0, 1, 2, 3, 4, 5, 6].map((d) =>
    formData.get(`minutes_${d}`),
  );
  const { kidId, minutes } = schema.parse({
    kidId: formData.get('kidId'),
    minutes: minutesRaw,
  });
  const { parent, kid } = await requireParentKid(kidId);
  const minutesByDay = Object.fromEntries(
    minutes.map((m, i) => [i, m]),
  ) as Record<number, number>;
  await upsertScreenTimeRules(parent.id, kid.id, minutesByDay);
  revalidatePath(`/kids/${kidId}/screen-time`);
}
