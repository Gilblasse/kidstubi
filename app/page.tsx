import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/profiles');

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-4xl font-bold">KidTube</h1>
        <p className="mb-8 text-muted-foreground">A safe YouTube for kids.</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/sign-in"
            className="rounded bg-primary px-4 py-2 text-primary-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded border border-input px-4 py-2"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
