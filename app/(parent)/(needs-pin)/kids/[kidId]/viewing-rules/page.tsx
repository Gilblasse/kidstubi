import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SaveButton } from '@/components/parent/SaveButton';
import { requireParentKid } from '@/lib/parent/context';
import { listKidKeywords } from '@/db/queries/viewingRules';
import { MAX_CONTENT_RATINGS, type MaxContentRating } from '@/db/schema';
import { RATING_LABELS, isMaxContentRating } from '@/lib/kid/viewingRules';
import {
  addKidKeywordAction,
  removeKidKeywordAction,
  updateKidDiscoveryEnabledAction,
  updateKidViewingRulesAction,
} from './actions';

export default async function ViewingRulesPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { parent, kid } = await requireParentKid(kidId);
  const keywords = await listKidKeywords(parent.id, kid.id);

  const currentRating: MaxContentRating = isMaxContentRating(kid.maxContentRating)
    ? kid.maxContentRating
    : 'tv_g';
  const ratingDisabled = !kid.discoveryEnabled;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Viewing rules for {kid.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          These rules apply to every search result, every approval request, and
          every watch. Stricter ratings hide unrated content; TV-PG and looser
          allow it through.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Discovery feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              When on, {kid.displayName} sees popular YouTube videos that pass
              the rating and keyword rules below. When off, only videos
              you&apos;ve approved appear.
            </p>
            <form action={updateKidDiscoveryEnabledAction} className="shrink-0">
              <input type="hidden" name="kidId" value={kid.id} />
              <input
                type="hidden"
                name="enabled"
                value={kid.discoveryEnabled ? 'false' : 'true'}
              />
              <Button
                type="submit"
                variant={kid.discoveryEnabled ? 'outline' : 'default'}
                size="sm"
              >
                {kid.discoveryEnabled ? 'Turn off' : 'Turn on'}
              </Button>
            </form>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Currently {kid.discoveryEnabled ? 'on' : 'off'}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maximum content rating</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateKidViewingRulesAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="kidId" value={kid.id} />
            <div className="flex-1">
              <Label htmlFor="maxContentRating">Allowed up to</Label>
              <select
                key={currentRating}
                id="maxContentRating"
                name="maxContentRating"
                defaultValue={currentRating}
                disabled={ratingDisabled}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm dark:bg-input/30"
              >
                {MAX_CONTENT_RATINGS.map((tier) => (
                  <option key={tier} value={tier}>
                    {RATING_LABELS[tier]}
                  </option>
                ))}
              </select>
            </div>
            <SaveButton className="sm:w-auto" disabled={ratingDisabled}>
              Save
            </SaveButton>
          </form>
          {ratingDisabled && (
            <p className="mt-2 text-xs text-muted-foreground">
              Only applies when Discovery feed is on.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kid-specific keywords ({keywords.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Apply only to {kid.displayName}. Your parent-wide blocklist still
            applies in addition to these.
          </p>
          <form
            action={addKidKeywordAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="kidId" value={kid.id} />
            <div className="flex-1">
              <Label htmlFor="keyword">Keyword</Label>
              <Input id="keyword" name="keyword" required maxLength={60} />
            </div>
            <Button type="submit" className="sm:w-auto">
              Add
            </Button>
          </form>

          {keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keywords yet.</p>
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
                  <form action={removeKidKeywordAction} className="shrink-0">
                    <input type="hidden" name="kidId" value={kid.id} />
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
