'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import {
  replaceScreenTimeWindows,
  upsertScreenTimeRules,
} from '@/db/queries/screenTime';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const DAILY_MAX_MINUTES = 23 * 60 + 45;

const durationSchema = z
  .object({
    hours: z.coerce.number().int().min(0).max(23),
    minutes: z.coerce.number().int().min(0).max(59),
  })
  .transform(({ hours, minutes }) => hours * 60 + minutes)
  .refine((m) => m >= 0 && m <= DAILY_MAX_MINUTES, {
    message: 'Daily allowance must be between 0h 0m and 23h 45m',
  });

const minutesSchema = z.object({
  kidId: z.string().uuid(),
  minutes: z.array(durationSchema).length(7),
});

export async function updateScreenTimeRulesAction(formData: FormData) {
  const minutesRaw = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    hours: formData.get(`hours_${d}`),
    minutes: formData.get(`mins_${d}`),
  }));
  const { kidId, minutes } = minutesSchema.parse({
    kidId: formData.get('kidId'),
    minutes: minutesRaw,
  });
  const { parent, kid } = await requireParentKid(kidId);
  const minutesByDay = Object.fromEntries(
    minutes.map((m, i) => [i, Math.round(m / 15) * 15]),
  ) as Record<number, number>;
  await upsertScreenTimeRules(parent.id, kid.id, minutesByDay);
  revalidatePath(`/kids/${kidId}/screen-time`);
}

const timeRowSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const windowsSchema = z.object({
  kidId: z.string().uuid(),
  windowsByDay: z.array(z.array(timeRowSchema)).length(7),
});

export async function updateScreenTimeWindowsAction(formData: FormData) {
  const windowsByDay: Array<Array<{ start: string; end: string }>> = [];
  for (let dow = 0; dow < 7; dow++) {
    const starts = formData.getAll(`windows_${dow}_start`).map(String);
    const ends = formData.getAll(`windows_${dow}_end`).map(String);
    const rows = starts
      .map((s, i) => ({ start: s, end: ends[i] ?? '' }))
      .filter((r) => r.start.length > 0 && r.end.length > 0);
    windowsByDay.push(rows);
  }
  const parsed = windowsSchema.parse({
    kidId: formData.get('kidId'),
    windowsByDay,
  });
  const { parent, kid } = await requireParentKid(parsed.kidId);

  const cleaned: Record<
    number,
    Array<{ startMinute: number; endMinute: number }>
  > = {};
  for (let dow = 0; dow < 7; dow++) {
    cleaned[dow] = parsed.windowsByDay[dow]
      .map((r) => ({
        startMinute: Math.round(toMinutes(r.start) / 15) * 15,
        endMinute: Math.round(toMinutes(r.end) / 15) * 15,
      }))
      .filter(
        (r) =>
          r.startMinute >= 0 &&
          r.endMinute <= 1440 &&
          r.startMinute < r.endMinute,
      );
  }
  await replaceScreenTimeWindows(parent.id, kid.id, cleaned);
  revalidatePath(`/kids/${parsed.kidId}/screen-time`);
}
