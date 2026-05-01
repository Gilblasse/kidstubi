import Link from 'next/link';
import { requireParent } from '@/lib/parent/context';
import {
  getKidDashboardStats,
  listKidProfilesForParent,
  type KidDashboardStats,
} from '@/db/queries/kidProfiles';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KidAvatar } from '@/components/kid/KidAvatar';
import { AvatarPicker } from '@/components/parent/AvatarPicker';
import { presetFromAvatarUrl } from '@/lib/avatars';
import { formatDuration, formatTimeAgo } from '@/lib/format';
import { createKidAction, updateKidAvatarAction } from './actions';

const EMPTY_STATS: KidDashboardStats = {
  kidProfileId: '',
  channelsCount: 0,
  pendingApprovalsCount: 0,
  watchHistoryCount: 0,
  lastWatchedAt: null,
  searchesLast7Days: 0,
  usageTodaySeconds: 0,
  allowedTodayMinutes: 0,
};

export default async function DashboardPage() {
  const parent = await requireParent();
  const [kids, statsMap] = await Promise.all([
    listKidProfilesForParent(parent.id),
    getKidDashboardStats(parent.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage kids, channels, and approvals.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add a kid</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createKidAction} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                required
                maxLength={40}
                placeholder="e.g. Mika"
              />
            </div>
            <AvatarPicker name="avatarKey" idPrefix="new" />
            <Button type="submit">Add kid</Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Kids ({kids.length})</h2>
          <p className="text-xs text-muted-foreground">
            Today and last 7 days. UTC.
          </p>
        </div>

        {kids.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Add a kid above to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {kids.map((k) => {
              const s = statsMap.get(k.id) ?? EMPTY_STATS;
              const currentPreset = presetFromAvatarUrl(k.avatarUrl);
              const allowedSeconds = s.allowedTodayMinutes * 60;
              const usagePct =
                allowedSeconds > 0
                  ? Math.min(
                      100,
                      Math.round((s.usageTodaySeconds / allowedSeconds) * 100),
                    )
                  : 0;
              const overBudget =
                allowedSeconds > 0 && s.usageTodaySeconds >= allowedSeconds;
              const noRule = s.allowedTodayMinutes === 0;

              return (
                <Card key={k.id}>
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <KidAvatar
                          displayName={k.displayName}
                          avatarUrl={k.avatarUrl}
                          size="md"
                        />
                        <div>
                          <CardTitle className="truncate">{k.displayName}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Search {k.searchEnabled ? 'on' : 'off'}
                            {k.liveSearchAlerts ? ' · live alerts' : null}
                          </p>
                        </div>
                      </div>
                      {s.pendingApprovalsCount > 0 ? (
                        <Link
                          href={`/kids/${k.id}/approvals`}
                          className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-500/30 hover:bg-amber-500/25 dark:text-amber-400"
                        >
                          {s.pendingApprovalsCount} pending
                        </Link>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between text-xs">
                        <span className="font-medium text-muted-foreground">
                          Today's screen time
                        </span>
                        <span className="font-mono">
                          {noRule ? (
                            <span className="text-muted-foreground">no rule set</span>
                          ) : (
                            <>
                              <span className={overBudget ? 'text-destructive' : ''}>
                                {formatDuration(s.usageTodaySeconds)}
                              </span>
                              <span className="text-muted-foreground">
                                {' / '}
                                {s.allowedTodayMinutes}m
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={
                            'absolute inset-y-0 left-0 rounded-full ' +
                            (overBudget ? 'bg-destructive' : 'bg-primary')
                          }
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    </div>

                    <dl className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Channels
                        </dt>
                        <dd className="text-xl font-semibold">{s.channelsCount}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Videos watched
                        </dt>
                        <dd className="text-xl font-semibold">{s.watchHistoryCount}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Searches 7d
                        </dt>
                        <dd className="text-xl font-semibold">{s.searchesLast7Days}</dd>
                      </div>
                    </dl>

                    <div className="text-xs text-muted-foreground">
                      {s.lastWatchedAt
                        ? `Last watched ${formatTimeAgo(s.lastWatchedAt)}`
                        : 'No watch activity yet'}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/kids/${k.id}/approvals`}
                        className={buttonVariants({
                          variant:
                            s.pendingApprovalsCount > 0 ? 'default' : 'outline',
                          size: 'sm',
                        })}
                      >
                        Approvals
                      </Link>
                      <Link
                        href={`/kids/${k.id}/channels`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Channels
                      </Link>
                      <Link
                        href={`/kids/${k.id}/screen-time`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Screen time
                      </Link>
                      <Link
                        href={`/kids/${k.id}/usage`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Usage
                      </Link>
                      <Link
                        href={`/kids/${k.id}/history`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        History
                      </Link>
                      <Link
                        href={`/kids/${k.id}/search-history`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Search
                      </Link>
                    </div>

                    <details className="rounded border border-border">
                      <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:bg-accent">
                        Change avatar
                      </summary>
                      <form
                        action={updateKidAvatarAction}
                        className="space-y-3 px-3 py-3"
                      >
                        <input type="hidden" name="kidProfileId" value={k.id} />
                        <AvatarPicker
                          name="avatarKey"
                          idPrefix={`edit-${k.id}`}
                          defaultKey={currentPreset?.key}
                        />
                        <Button type="submit" size="sm">
                          Save avatar
                        </Button>
                      </form>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
