import Link from 'next/link';

export function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center rounded px-2 py-1 text-sm hover:bg-accent"
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
    >
      <span aria-hidden>🔔</span>
      {count > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
