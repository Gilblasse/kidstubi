import Link from 'next/link';
import { requireParent } from '@/lib/parent/context';
import { listNotificationsForParent } from '@/db/queries/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAgo } from '@/lib/format';
import { markAllNotificationsReadAction } from './actions';

export default async function NotificationsPage() {
  const parent = await requireParent();
  const items = await listNotificationsForParent(parent.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Latest {items.length}.
          </p>
        </div>
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="outline" size="sm">
            Mark all read
          </Button>
        </form>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id}>
              <Card className={n.readAt ? 'opacity-70' : ''}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {n.href ? (
                      <Link href={n.href} className="hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(n.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
