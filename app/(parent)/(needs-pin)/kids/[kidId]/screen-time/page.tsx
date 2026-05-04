import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  listScreenTimeRulesForKid,
  listScreenTimeWindowsForKid,
} from '@/db/queries/screenTime';
import { requireParentKid } from '@/lib/parent/context';
import { DailyMinutesEditor } from '@/components/parent/DailyMinutesEditor';
import { DayWindowsEditor } from '@/components/parent/DayWindowsEditor';
import { SaveButton } from '@/components/parent/SaveButton';
import {
  updateScreenTimeRulesAction,
  updateScreenTimeWindowsAction,
} from './actions';

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default async function ScreenTimePage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireParentKid(kidId);
  const [rules, windows] = await Promise.all([
    listScreenTimeRulesForKid(parent.id, kid.id),
    listScreenTimeWindowsForKid(parent.id, kid.id),
  ]);
  const minutesByDay = new Map(rules.map((r) => [r.dayOfWeek, r.allowedMinutes]));
  const initialMinutesByDay = DAY_LABELS.map(
    (_, dow) => minutesByDay.get(dow) ?? 0,
  );
  const windowsByDay = new Map<
    number,
    Array<{ startMinute: number; endMinute: number }>
  >();
  for (const w of windows) {
    const list = windowsByDay.get(w.dayOfWeek) ?? [];
    list.push({ startMinute: w.startMinute, endMinute: w.endMinute });
    windowsByDay.set(w.dayOfWeek, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Screen time for {kid.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Set the daily allowance as hh:mm (15-minute steps, max 23:45).
          00:00 = no playback that day. Boundaries are computed in UTC.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Daily allowance</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            key={initialMinutesByDay.join(',')}
            action={updateScreenTimeRulesAction}
            className="space-y-4"
          >
            <input type="hidden" name="kidId" value={kid.id} />
            <DailyMinutesEditor
              dayLabels={DAY_LABELS}
              initialMinutesByDay={initialMinutesByDay}
            />
            <SaveButton>Save</SaveButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Allowed time windows</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Times are in UTC. If a day has no windows, the kid can use the site
            any time that day (within the minute budget). Add a window to
            restrict to specific hours.
          </p>
          <form
            action={updateScreenTimeWindowsAction}
            className="space-y-4"
          >
            <input type="hidden" name="kidId" value={kid.id} />
            <div className="space-y-3">
              {DAY_LABELS.map((name, dow) => (
                <DayWindowsEditor
                  key={dow}
                  dayOfWeek={dow}
                  dayLabel={name}
                  initial={windowsByDay.get(dow) ?? []}
                />
              ))}
            </div>
            <SaveButton>Save windows</SaveButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
