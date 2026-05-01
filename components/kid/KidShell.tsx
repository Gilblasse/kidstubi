'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SearchBar } from './SearchBar';
import { KidAvatar } from './KidAvatar';

export function KidShell({
  kidId,
  kidName,
  kidAvatarUrl,
  searchEnabled,
  children,
}: {
  kidId: string;
  kidName: string;
  kidAvatarUrl: string | null;
  searchEnabled: boolean;
  children: React.ReactNode;
}) {
  const [railOpen, setRailOpen] = useState(true);

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setRailOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-accent"
          aria-label={railOpen ? 'Hide menu' : 'Show menu'}
          aria-expanded={railOpen}
        >
          <span aria-hidden className="text-xl leading-none">
            ☰
          </span>
        </button>
        <Link href={`/k/${kidId}`} className="text-lg font-semibold">
          KidTube
        </Link>
        <div className="flex flex-1 justify-center">
          {searchEnabled ? (
            <SearchBar kidId={kidId} />
          ) : (
            <div className="h-9 w-full max-w-xl rounded-full border border-input bg-card px-4 text-sm leading-9 text-muted-foreground">
              Search is off
            </div>
          )}
        </div>
        <KidAvatar
          displayName={kidName}
          avatarUrl={kidAvatarUrl}
          size="sm"
        />
      </header>
      <div className="flex flex-1">
        {railOpen && (
          <nav className="w-56 shrink-0 border-r border-border bg-background py-4">
            <ul className="space-y-1 px-2 text-sm">
              <li>
                <Link
                  href={`/k/${kidId}`}
                  className="block rounded px-3 py-2 hover:bg-accent"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href={`/k/${kidId}/subscriptions`}
                  className="block rounded px-3 py-2 hover:bg-accent"
                >
                  Subscriptions
                </Link>
              </li>
              <li>
                <Link
                  href={`/k/${kidId}/history`}
                  className="block rounded px-3 py-2 hover:bg-accent"
                >
                  History
                </Link>
              </li>
            </ul>
          </nav>
        )}
        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
