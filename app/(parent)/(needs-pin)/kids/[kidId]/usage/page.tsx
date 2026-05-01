import { requireParentKid } from '@/lib/parent/context';
import { listScreenTimeSessionsInRange } from '@/db/queries/screenTime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDuration } from '@/lib/format';
import type { ScreenTimeSession } from '@/db/schema';

const RANGE_DAYS = 30;

function isoDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildLast30Days(now: Date): string[] {
  const out: string[] = [];
  for (let i = RANGE_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDayKey(d));
  }
  return out;
}

function aggregate(sessions: ScreenTimeSession[]): {
  totalSeconds: number;
  byDay: Map<string, number>;
} {
  const byDay = new Map<string, number>();
  let total = 0;
  for (const s of sessions) {
    const key = isoDayKey(s.startedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + s.secondsUsed);
    total += s.secondsUsed;
  }
  return { totalSeconds: total, byDay };
}

export default async function UsagePage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireParentKid(kidId);

  const now = new Date();
  const from = new Date(now);
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - (RANGE_DAYS - 1));
  const to = new Date(now);
  to.setUTCHours(0, 0, 0, 0);
  to.setUTCDate(to.getUTCDate() + 1);

  const sessions = await listScreenTimeSessionsInRange(
    parent.id,
    kid.id,
    from,
    to,
  );
  const { totalSeconds, byDay } = aggregate(sessions);
  const days = buildLast30Days(now);
  const dailyValues = days.map((d) => byDay.get(d) ?? 0);
  const max = Math.max(1, ...dailyValues);

  const avgPerDay = Math.round(totalSeconds / RANGE_DAYS);
  const avgPerWeek = Math.round((totalSeconds / RANGE_DAYS) * 7);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Usage for {kid.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          Last {RANGE_DAYS} days. Boundaries are UTC.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average per day
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatDuration(avgPerDay)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average per week
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatDuration(avgPerWeek)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total in range
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatDuration(totalSeconds)}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily totals</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-1.5">
            {days.map((day, idx) => {
              const seconds = dailyValues[idx]!;
              const pct = (seconds / max) * 100;
              return (
                <li key={day} className="flex items-center gap-3 text-xs">
                  <span className="w-24 font-mono text-muted-foreground">
                    {day}
                  </span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono">
                    {formatDuration(seconds)}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
