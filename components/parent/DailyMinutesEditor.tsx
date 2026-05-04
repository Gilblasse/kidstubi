'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';

type HM = { hours: number; minutes: number };

function toHM(totalMinutes: number): HM {
  const safe = Math.max(0, totalMinutes);
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export function DailyMinutesEditor({
  dayLabels,
  initialMinutesByDay,
}: {
  dayLabels: string[];
  initialMinutesByDay: number[];
}) {
  const [values, setValues] = useState<HM[]>(() =>
    initialMinutesByDay.map(toHM),
  );

  const inputClass =
    'h-8 w-16 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {dayLabels.map((name, dow) => (
        <div key={dow} className="flex items-center gap-3">
          <Label htmlFor={`hours_${dow}`} className="w-24">
            {name}
          </Label>
          <div className="flex items-center gap-1.5">
            <input
              id={`hours_${dow}`}
              name={`hours_${dow}`}
              type="number"
              min={0}
              max={23}
              step={1}
              required
              value={values[dow].hours}
              onChange={(e) =>
                setValues((prev) => {
                  const next = [...prev];
                  next[dow] = { ...next[dow], hours: Number(e.target.value) };
                  return next;
                })
              }
              className={inputClass}
            />
            <span className="text-sm text-muted-foreground">h</span>
            <input
              id={`mins_${dow}`}
              name={`mins_${dow}`}
              type="number"
              min={0}
              max={59}
              step={15}
              required
              value={values[dow].minutes}
              onChange={(e) =>
                setValues((prev) => {
                  const next = [...prev];
                  next[dow] = { ...next[dow], minutes: Number(e.target.value) };
                  return next;
                })
              }
              className={inputClass}
            />
            <span className="text-sm text-muted-foreground">m</span>
          </div>
        </div>
      ))}
    </div>
  );
}
