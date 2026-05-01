import 'server-only';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  digestRuns,
  notifications,
  type DigestRun,
  type NewNotification,
  type Notification,
} from '../schema';

export async function listNotificationsForParent(
  parentId: string,
  limit = 30,
): Promise<Notification[]> {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.parentId, parentId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadForParent(parentId: string): Promise<number> {
  const rows = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.parentId, parentId), isNull(notifications.readAt)),
    );
  return Number(rows[0]?.count ?? 0);
}

export async function insertNotification(
  input: Omit<NewNotification, 'id' | 'createdAt' | 'readAt'>,
): Promise<Notification> {
  const { parentId, kind, title, body, href } = input;
  const rows = await getDb()
    .insert(notifications)
    .values({ parentId, kind, title, body, href })
    .returning();
  return rows[0]!;
}

export async function markAllReadForParent(parentId: string): Promise<void> {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.parentId, parentId), isNull(notifications.readAt)),
    );
}

export async function findDigestRunForDay(
  parentId: string,
  dayKey: string,
): Promise<DigestRun | null> {
  const rows = await getDb()
    .select()
    .from(digestRuns)
    .where(and(eq(digestRuns.parentId, parentId), eq(digestRuns.dayKey, dayKey)))
    .orderBy(asc(digestRuns.sentAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function recordDigestRun(
  parentId: string,
  dayKey: string,
): Promise<void> {
  await getDb().insert(digestRuns).values({ parentId, dayKey });
}

export type { Notification, NewNotification, DigestRun, NewDigestRun } from '../schema';
