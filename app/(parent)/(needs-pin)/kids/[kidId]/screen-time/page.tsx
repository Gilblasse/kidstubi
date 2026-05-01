import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { listScreenTimeRulesForKid } from '@/db/queries/screenTime';
import { requireParentKid } from '@/lib/parent/context';
import { updateScreenTimeRulesAction } from './actions';

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
  const rules = await listScreenTimeRulesForKid(parent.id, kid.id);
  const minutesByDay = new Map(rules.map((r) => [r.dayOfWeek, r.allowedMinutes]));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Screen time for {kid.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Set the daily allowance in minutes. 0 = no playback that day.
          Boundaries are computed in UTC.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Daily minutes</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateScreenTimeRulesAction} className="space-y-4">
            <input type="hidden" name="kidId" value={kid.id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DAY_LABELS.map((name, dow) => {
                const value = minutesByDay.get(dow) ?? 0;
                return (
                  <div key={dow} className="flex items-center gap-3">
                    <Label htmlFor={`minutes_${dow}`} className="w-24">
                      {name}
                    </Label>
                    <input
                      key={`${dow}-${value}`}
                      id={`minutes_${dow}`}
                      name={`minutes_${dow}`}
                      type="number"
                      min={0}
                      max={1440}
                      defaultValue={value}
                      className="h-8 w-28 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                );
              })}
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
