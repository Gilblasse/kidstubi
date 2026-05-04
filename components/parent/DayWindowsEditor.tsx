'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Row = { start: string; end: string };

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function DayWindowsEditor({
  dayOfWeek,
  dayLabel,
  initial,
}: {
  dayOfWeek: number;
  dayLabel: string;
  initial: Array<{ startMinute: number; endMinute: number }>;
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((w) => ({
      start: minutesToHHMM(w.startMinute),
      end: minutesToHHMM(w.endMinute === 1440 ? 1440 - 15 : w.endMinute),
    })),
  );

  function addRow() {
    setRows((prev) => [...prev, { start: '', end: '' }]);
  }
  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const hasIncompleteRow = rows.some(
    (r) => r.start.length === 0 || r.end.length === 0,
  );

  return (
    <div className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{dayLabel}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Add window for ${dayLabel}`}
          onClick={addRow}
          disabled={hasIncompleteRow}
        >
          +
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No windows — always allowed.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, idx) => (
            <li key={idx} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                name={`windows_${dayOfWeek}_start`}
                step={900}
                required
                value={row.start}
                onChange={(e) => updateRow(idx, { start: e.target.value })}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="time"
                name={`windows_${dayOfWeek}_end`}
                step={900}
                required
                value={row.end}
                onChange={(e) => updateRow(idx, { end: e.target.value })}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove window"
                onClick={() => removeRow(idx)}
              >
                −
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
