'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { KidProfile } from '@/db/schema';
import { KidAvatar } from '@/components/kid/KidAvatar';

const ACTIVE_CLASS = 'bg-accent text-accent-foreground font-medium';

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function SidebarNav({ kids }: { kids: KidProfile[] }) {
  const pathname = usePathname();
  const overviewActive = isActive(pathname, '/dashboard', true);
  const profilesActive = isActive(pathname, '/profiles', true);
  const blocklistActive = isActive(pathname, '/settings/blocklist');
  return (
    <>
      <div className="px-4 py-4">
        <Link href="/dashboard" className="text-lg font-semibold">
          KidTube
        </Link>
        <p className="text-xs text-muted-foreground">Parent dashboard</p>
      </div>
      <nav className="px-2 text-sm">
        <Link
          href="/dashboard"
          aria-current={overviewActive ? 'page' : undefined}
          className={
            'block rounded px-3 py-2 hover:bg-accent' +
            (overviewActive ? ' ' + ACTIVE_CLASS : '')
          }
        >
          Overview
        </Link>
        <Link
          href="/profiles"
          aria-current={profilesActive ? 'page' : undefined}
          className={
            'block rounded px-3 py-2 hover:bg-accent' +
            (profilesActive ? ' ' + ACTIVE_CLASS : '')
          }
        >
          Switch profile
        </Link>
        <Link
          href="/settings/blocklist"
          aria-current={blocklistActive ? 'page' : undefined}
          className={
            'block rounded px-3 py-2 hover:bg-accent' +
            (blocklistActive ? ' ' + ACTIVE_CLASS : '')
          }
        >
          Blocklist
        </Link>
        <div className="mt-4 px-3 text-xs uppercase tracking-wide text-muted-foreground">
          Kids
        </div>
        <ul className="mt-1 space-y-0.5">
          {kids.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No kids yet.
            </li>
          )}
          {kids.map((k) => {
            const kidActive = pathname.startsWith(`/kids/${k.id}/`);
            const channelsActive = isActive(pathname, `/kids/${k.id}/channels`);
            const historyActive = isActive(pathname, `/kids/${k.id}/history`);
            const screenTimeActive = isActive(pathname, `/kids/${k.id}/screen-time`);
            const usageActive = isActive(pathname, `/kids/${k.id}/usage`);
            const approvalsActive = isActive(pathname, `/kids/${k.id}/approvals`);
            const searchHistoryActive = isActive(pathname, `/kids/${k.id}/search-history`);
            const viewingRulesActive = isActive(pathname, `/kids/${k.id}/viewing-rules`);
            return (
              <li key={k.id}>
                <details className="rounded" open={kidActive}>
                  <summary
                    className={
                      'flex cursor-pointer items-center gap-2 rounded px-3 py-2 hover:bg-accent' +
                      (kidActive ? ' ' + ACTIVE_CLASS : '')
                    }
                  >
                    <KidAvatar
                      displayName={k.displayName}
                      avatarUrl={k.avatarUrl}
                      size="sm"
                    />
                    <span className="truncate">{k.displayName}</span>
                  </summary>
                  <ul className="ml-3 space-y-0.5 border-l border-border pl-2 text-xs">
                    <li>
                      <Link
                        href={`/kids/${k.id}/channels`}
                        aria-current={channelsActive ? 'page' : undefined}
                        className={
                          'block rounded px-3 py-1.5 hover:bg-accent' +
                          (channelsActive ? ' ' + ACTIVE_CLASS : '')
                        }
                      >
                        Channels
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/kids/${k.id}/history`}
                        aria-current={historyActive ? 'page' : undefined}
                        className={
                          'block rounded px-3 py-1.5 hover:bg-accent' +
                          (historyActive ? ' ' + ACTIVE_CLASS : '')
                        }
                      >
                        History
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/kids/${k.id}/screen-time`}
                        aria-current={screenTimeActive ? 'page' : undefined}
                        className={
                          'block rounded px-3 py-1.5 hover:bg-accent' +
                          (screenTimeActive ? ' ' + ACTIVE_CLASS : '')
                        }
                      >
                        Screen time
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/kids/${k.id}/usage`}
                        aria-current={usageActive ? 'page' : undefined}
                        className={
                          'block rounded px-3 py-1.5 hover:bg-accent' +
                          (usageActive ? ' ' + ACTIVE_CLASS : '')
                        }
                      >
                        Usage
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/kids/${k.id}/approvals`}
                        aria-current={approvalsActive ? 'page' : undefined}
                        className={
                          'block rounded px-3 py-1.5 hover:bg-accent' +
                          (approvalsActive ? ' ' + ACTIVE_CLASS : '')
                        }
                      >
                        Approvals
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/kids/${k.id}/search-history`}
                        aria-current={searchHistoryActive ? 'page' : undefined}
                        className={
                          'block rounded px-3 py-1.5 hover:bg-accent' +
                          (searchHistoryActive ? ' ' + ACTIVE_CLASS : '')
                        }
                      >
                        Search history
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/kids/${k.id}/viewing-rules`}
                        aria-current={viewingRulesActive ? 'page' : undefined}
                        className={
                          'block rounded px-3 py-1.5 hover:bg-accent' +
                          (viewingRulesActive ? ' ' + ACTIVE_CLASS : '')
                        }
                      >
                        Viewing rules
                      </Link>
                    </li>
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function Sidebar({ kids }: { kids: KidProfile[] }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
      <SidebarNav kids={kids} />
    </aside>
  );
}
