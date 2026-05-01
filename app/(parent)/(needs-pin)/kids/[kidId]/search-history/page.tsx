import { requireParentKid } from '@/lib/parent/context';
import { listSearchHistoryForKid } from '@/db/queries/search';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAgo } from '@/lib/format';
import { updateKidSearchSettingsAction } from './actions';

export default async function ParentSearchHistoryPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireParentKid(kidId);
  const history = await listSearchHistoryForKid(parent.id, kid.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Search history for {kid.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Last {history.length} queries.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Search settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateKidSearchSettingsAction}
            className="space-y-3 text-sm"
          >
            <input type="hidden" name="kidId" value={kid.id} />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="searchEnabled"
                defaultChecked={kid.searchEnabled}
                className="h-4 w-4 rounded border-input"
              />
              Allow this kid to search
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="liveSearchAlerts"
                defaultChecked={kid.liveSearchAlerts}
                className="h-4 w-4 rounded border-input"
              />
              Notify me on every search
            </label>
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No searches yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{s.query}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.resultCount} results · {formatTimeAgo(s.searchedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
