import Link from 'next/link';
import { requireParent } from '@/lib/parent/context';
import { listKidProfilesForParent } from '@/db/queries/kidProfiles';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createKidAction } from './actions';

export default async function DashboardPage() {
  const parent = await requireParent();
  const kids = await listKidProfilesForParent(parent.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
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
          <form
            action={createKidAction}
            className="flex items-end gap-3"
          >
            <div className="flex-1">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                required
                maxLength={40}
                placeholder="e.g. Mika"
              />
            </div>
            <Button type="submit">Add kid</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kids ({kids.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {kids.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a kid above to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {kids.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="font-medium">{k.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      Search {k.searchEnabled ? 'on' : 'off'}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/kids/${k.id}/channels`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Channels
                    </Link>
                    <Link
                      href={`/kids/${k.id}/approvals`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Approvals
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
