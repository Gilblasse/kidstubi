import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getParentByClerkId } from '@/db/queries/parents';
import { listKidProfilesForParent } from '@/db/queries/kidProfiles';
import { countUnreadForParent } from '@/db/queries/notifications';
import { Sidebar } from '@/components/parent/Sidebar';
import { NotificationBell } from '@/components/parent/NotificationBell';

export default async function NeedsPinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parent = await getParentByClerkId(userId);
  if (!parent || !parent.pinHash) redirect('/setup-pin');
  const [kids, unread] = await Promise.all([
    listKidProfilesForParent(parent.id),
    countUnreadForParent(parent.id),
  ]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar kids={kids} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-border bg-card px-4 py-2">
          <NotificationBell count={unread} />
          <UserButton />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
