'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SearchBar } from './SearchBar';
import { KidAvatarMenu } from './KidAvatarMenu';

const ACTIVE_CLASS = 'bg-accent text-accent-foreground font-medium';

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function KidShell({
  kidId,
  kidName,
  kidAvatarUrl,
  children,
}: {
  kidId: string;
  kidName: string;
  kidAvatarUrl: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
  }

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur sm:gap-4 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded transition-all hover:bg-accent active:translate-y-px active:scale-[0.98] md:hidden"
          aria-label={drawerOpen ? 'Hide menu' : 'Show menu'}
          aria-expanded={drawerOpen}
        >
          <span aria-hidden className="text-xl leading-none">
            ☰
          </span>
        </button>
        <Link
          href={`/k/${kidId}`}
          className="shrink-0 text-base font-semibold sm:text-lg"
        >
          KidTube
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <SearchBar kidId={kidId} />
        </div>
        <KidAvatarMenu
          displayName={kidName}
          avatarUrl={kidAvatarUrl}
        />
      </header>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 cursor-pointer bg-black/60 md:hidden"
        />
      )}

      <div className="flex flex-1">
        <nav
          aria-label="Primary"
          className={
            'fixed inset-y-0 left-0 z-50 w-60 transform border-r border-border bg-background py-4 transition-transform duration-200 ' +
            (drawerOpen ? 'translate-x-0' : '-translate-x-full') +
            ' md:static md:z-auto md:w-56 md:translate-x-0 md:transition-none'
          }
        >
          <ul className="space-y-1 px-2 text-sm">
            <li>
              <Link
                href={`/k/${kidId}`}
                aria-current={isActive(pathname, `/k/${kidId}`, true) ? 'page' : undefined}
                className={
                  'block rounded px-3 py-2 hover:bg-accent' +
                  (isActive(pathname, `/k/${kidId}`, true) ? ' ' + ACTIVE_CLASS : '')
                }
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href={`/k/${kidId}/subscriptions`}
                aria-current={isActive(pathname, `/k/${kidId}/subscriptions`) ? 'page' : undefined}
                className={
                  'block rounded px-3 py-2 hover:bg-accent' +
                  (isActive(pathname, `/k/${kidId}/subscriptions`) ? ' ' + ACTIVE_CLASS : '')
                }
              >
                Subscriptions
              </Link>
            </li>
          </ul>
        </nav>
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
