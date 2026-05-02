import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getParentByClerkId } from '@/db/queries/parents';
import { listKidProfilesForParent } from '@/db/queries/kidProfiles';
import { countUnreadForParent } from '@/db/queries/notifications';
import { Sidebar, SidebarNav } from '@/components/parent/Sidebar';
import { MobileNav } from '@/components/parent/MobileNav';
import { NotificationBell } from '@/components/parent/NotificationBell';
import { ParentUserButton } from '@/components/parent/ParentUserButton';

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
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-2 sm:px-4">
          <MobileNav>
            <SidebarNav kids={kids} />
          </MobileNav>
          <Link
            href="/dashboard"
            className="text-base font-semibold md:hidden"
          >
            KidTube
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NotificationBell count={unread} />
            <ParentUserButton />
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
