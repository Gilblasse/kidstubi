import Link from 'next/link';
import type { KidProfile } from '@/db/schema';

export function Sidebar({ kids }: { kids: KidProfile[] }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
      <div className="px-4 py-4">
        <Link href="/dashboard" className="text-lg font-semibold">
          KidTube
        </Link>
        <p className="text-xs text-muted-foreground">Parent dashboard</p>
      </div>
      <nav className="px-2 text-sm">
        <Link
          href="/dashboard"
          className="block rounded px-3 py-2 hover:bg-accent"
        >
          Overview
        </Link>
        <Link
          href="/profiles"
          className="block rounded px-3 py-2 hover:bg-accent"
        >
          Switch profile
        </Link>
        <Link
          href="/settings/blocklist"
          className="block rounded px-3 py-2 hover:bg-accent"
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
          {kids.map((k) => (
            <li key={k.id}>
              <details className="rounded">
                <summary className="cursor-pointer rounded px-3 py-2 hover:bg-accent">
                  {k.displayName}
                </summary>
                <ul className="ml-3 space-y-0.5 border-l border-border pl-2 text-xs">
                  <li>
                    <Link
                      href={`/kids/${k.id}/channels`}
                      className="block rounded px-3 py-1.5 hover:bg-accent"
                    >
                      Channels
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/kids/${k.id}/history`}
                      className="block rounded px-3 py-1.5 hover:bg-accent"
                    >
                      History
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/kids/${k.id}/screen-time`}
                      className="block rounded px-3 py-1.5 hover:bg-accent"
                    >
                      Screen time
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/kids/${k.id}/usage`}
                      className="block rounded px-3 py-1.5 hover:bg-accent"
                    >
                      Usage
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/kids/${k.id}/approvals`}
                      className="block rounded px-3 py-1.5 hover:bg-accent"
                    >
                      Approvals
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/kids/${k.id}/search-history`}
                      className="block rounded px-3 py-1.5 hover:bg-accent"
                    >
                      Search history
                    </Link>
                  </li>
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
