import { requireParent } from '@/lib/parent/context';
import { listBlocklistForParent } from '@/db/queries/blocklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addBlocklistAction,
  removeBlocklistAction,
} from '@/app/(parent)/(needs-pin)/kids/[kidId]/search-history/actions';

export default async function BlocklistPage() {
  const parent = await requireParent();
  const keywords = await listBlocklistForParent(parent.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Search blocklist</h1>
        <p className="text-sm text-muted-foreground">
          Keywords (case-insensitive). Search results whose title, description,
          or channel name contain a keyword are filtered out for every kid.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add keyword</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={addBlocklistAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="keyword">Keyword</Label>
              <Input id="keyword" name="keyword" required maxLength={60} />
            </div>
            <Button type="submit" className="sm:w-auto">
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current ({keywords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keywords.</p>
          ) : (
            <ul className="divide-y divide-border">
              {keywords.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="min-w-0 truncate font-mono text-sm">
                    {k.keyword}
                  </span>
                  <form action={removeBlocklistAction} className="shrink-0">
                    <input type="hidden" name="id" value={k.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
