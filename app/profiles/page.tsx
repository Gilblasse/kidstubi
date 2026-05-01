import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getParentByClerkId } from '@/db/queries/parents';
import { listKidProfilesForParent } from '@/db/queries/kidProfiles';
import { KidAvatar } from '@/components/kid/KidAvatar';
import { setActiveKidProfile } from './actions';

export default async function ProfilesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parent = await getParentByClerkId(userId);
  if (!parent) redirect('/sign-in');
  if (!parent.pinHash) redirect('/setup-pin');
  const kids = await listKidProfilesForParent(parent.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-8">
      <h1 className="mb-6 text-2xl font-semibold">Who&apos;s watching?</h1>
      {kids.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Add a kid profile from the{' '}
          <Link href="/dashboard" className="underline">
            dashboard
          </Link>{' '}
          first.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {kids.map((kid) => (
            <li key={kid.id}>
              <form action={setActiveKidProfile}>
                <input type="hidden" name="kidProfileId" value={kid.id} />
                <button
                  type="submit"
                  className="flex w-full flex-col items-center gap-2 rounded-lg border border-input p-4 hover:bg-accent"
                >
                  <KidAvatar
                    displayName={kid.displayName}
                    avatarUrl={kid.avatarUrl}
                    size="xl"
                  />
                  <span className="text-sm">{kid.displayName}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
