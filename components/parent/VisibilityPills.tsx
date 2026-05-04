'use client';

import { useState } from 'react';
import { updateVisibilityAction } from '@/app/(parent)/(needs-pin)/kids/[kidId]/approved-videos/actions';

const DAYS: Array<{ short: string; full: string }> = [
  { short: 'S', full: 'Sunday' },
  { short: 'M', full: 'Monday' },
  { short: 'T', full: 'Tuesday' },
  { short: 'W', full: 'Wednesday' },
  { short: 'T', full: 'Thursday' },
  { short: 'F', full: 'Friday' },
  { short: 'S', full: 'Saturday' },
];

export function VisibilityPills({
  kidId,
  videoId,
  initialDays,
}: {
  kidId: string;
  videoId: string;
  initialDays: number[];
}) {
  const [days, setDays] = useState<Set<number>>(new Set(initialDays));

  function toggle(dow: number) {
    const next = new Set(days);
    if (next.has(dow)) next.delete(dow);
    else next.add(dow);
    setDays(next);
    const fd = new FormData();
    fd.set('kidId', kidId);
    fd.set('videoId', videoId);
    for (const d of next) fd.append('day', String(d));
    void updateVisibilityAction(fd);
  }

  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="sr-only">Visible on</legend>
      {DAYS.map((d, dow) => {
        const checked = days.has(dow);
        return (
          <label key={dow} className="cursor-pointer" title={d.full}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(dow)}
              aria-label={d.full}
              className="peer sr-only"
            />
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-input bg-transparent text-xs font-medium text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
              {d.short}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
