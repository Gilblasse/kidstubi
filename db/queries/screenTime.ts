import 'server-only';
import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  kidProfiles,
  screenTimeRules,
  screenTimeSessions,
  type ScreenTimeRule,
  type ScreenTimeSession,
} from '../schema';

const ORPHAN_SESSION_CAP_SECONDS = 4 * 60 * 60;

export async function listScreenTimeRulesForKid(
  parentId: string,
  kidProfileId: string,
): Promise<ScreenTimeRule[]> {
  const rows = await getDb()
    .select({ r: screenTimeRules })
    .from(screenTimeRules)
    .innerJoin(kidProfiles, eq(screenTimeRules.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(screenTimeRules.kidProfileId, kidProfileId),
      ),
    );
  return rows.map((r) => r.r);
}

export async function upsertScreenTimeRules(
  parentId: string,
  kidProfileId: string,
  minutesByDay: Record<number, number>,
): Promise<void> {
  const db = getDb();
  const kid = await db
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)))
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  await db
    .delete(screenTimeRules)
    .where(eq(screenTimeRules.kidProfileId, kidProfileId));
  const rows = Object.entries(minutesByDay)
    .map(([dayStr, minutes]) => ({
      kidProfileId,
      dayOfWeek: Number(dayStr),
      allowedMinutes: Math.max(0, Math.floor(minutes)),
    }))
    .filter((r) => r.dayOfWeek >= 0 && r.dayOfWeek <= 6);
  if (rows.length > 0) {
    await db.insert(screenTimeRules).values(rows);
  }
}

function startOfTodayUtc(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfTodayUtc(now: Date): Date {
  const d = startOfTodayUtc(now);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function dayOfWeekUtc(now: Date): number {
  return now.getUTCDay();
}

export type RemainingComputation = {
  remainingSeconds: number;
  allowedMinutes: number;
  usedSeconds: number;
};

export async function computeRemainingSecondsForKid(
  parentId: string,
  kidProfileId: string,
  now: Date = new Date(),
): Promise<RemainingComputation> {
  const db = getDb();
  const kid = await db
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)))
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');

  const dow = dayOfWeekUtc(now);
  const ruleRows = await db
    .select({ minutes: screenTimeRules.allowedMinutes })
    .from(screenTimeRules)
    .where(
      and(
        eq(screenTimeRules.kidProfileId, kidProfileId),
        eq(screenTimeRules.dayOfWeek, dow),
      ),
    )
    .limit(1);
  const allowedMinutes = ruleRows[0]?.minutes ?? 0;
  const allowedSeconds = allowedMinutes * 60;

  const dayStart = startOfTodayUtc(now);
  const dayEnd = endOfTodayUtc(now);

  const usedRows = await db
    .select({
      total: sql<number>`coalesce(sum(${screenTimeSessions.secondsUsed})::int, 0)`,
    })
    .from(screenTimeSessions)
    .where(
      and(
        eq(screenTimeSessions.kidProfileId, kidProfileId),
        gte(screenTimeSessions.startedAt, dayStart),
        lt(screenTimeSessions.startedAt, dayEnd),
      ),
    );
  const closedSeconds = Number(usedRows[0]?.total ?? 0);

  const openRows = await db
    .select({
      startedAt: screenTimeSessions.startedAt,
    })
    .from(screenTimeSessions)
    .where(
      and(
        eq(screenTimeSessions.kidProfileId, kidProfileId),
        isNull(screenTimeSessions.endedAt),
        gte(screenTimeSessions.startedAt, dayStart),
        lt(screenTimeSessions.startedAt, dayEnd),
      ),
    );
  const openSeconds = openRows.reduce((sum, row) => {
    const elapsed = Math.floor((now.getTime() - row.startedAt.getTime()) / 1000);
    return sum + Math.min(Math.max(elapsed, 0), ORPHAN_SESSION_CAP_SECONDS);
  }, 0);

  const usedSeconds = closedSeconds + openSeconds;
  const remainingSeconds = Math.max(0, allowedSeconds - usedSeconds);
  return { remainingSeconds, allowedMinutes, usedSeconds };
}

export async function closeOpenScreenTimeSessionsForKid(
  parentId: string,
  kidProfileId: string,
  now: Date = new Date(),
): Promise<void> {
  const db = getDb();
  const kid = await db
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)))
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  const open = await db
    .select({ id: screenTimeSessions.id, startedAt: screenTimeSessions.startedAt })
    .from(screenTimeSessions)
    .where(
      and(
        eq(screenTimeSessions.kidProfileId, kidProfileId),
        isNull(screenTimeSessions.endedAt),
      ),
    );
  for (const row of open) {
    const elapsed = Math.floor((now.getTime() - row.startedAt.getTime()) / 1000);
    const capped = Math.min(
      Math.max(0, elapsed),
      ORPHAN_SESSION_CAP_SECONDS,
    );
    await db
      .update(screenTimeSessions)
      .set({ endedAt: now, secondsUsed: capped })
      .where(eq(screenTimeSessions.id, row.id));
  }
}

export async function openScreenTimeSession(
  parentId: string,
  kidProfileId: string,
): Promise<ScreenTimeSession> {
  const db = getDb();
  await closeOpenScreenTimeSessionsForKid(parentId, kidProfileId);
  const rows = await db
    .insert(screenTimeSessions)
    .values({ kidProfileId })
    .returning();
  return rows[0]!;
}

export async function closeScreenTimeSession(
  parentId: string,
  sessionId: string,
  secondsUsed: number,
): Promise<void> {
  const db = getDb();
  const capped = Math.min(
    Math.max(0, Math.floor(secondsUsed)),
    ORPHAN_SESSION_CAP_SECONDS,
  );
  await db
    .update(screenTimeSessions)
    .set({ endedAt: new Date(), secondsUsed: capped })
    .from(kidProfiles)
    .where(
      and(
        eq(screenTimeSessions.id, sessionId),
        eq(screenTimeSessions.kidProfileId, kidProfiles.id),
        eq(kidProfiles.parentId, parentId),
        isNull(screenTimeSessions.endedAt),
      ),
    );
}

export async function listScreenTimeSessionsInRange(
  parentId: string,
  kidProfileId: string,
  from: Date,
  to: Date,
): Promise<ScreenTimeSession[]> {
  const rows = await getDb()
    .select({ s: screenTimeSessions })
    .from(screenTimeSessions)
    .innerJoin(kidProfiles, eq(screenTimeSessions.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(screenTimeSessions.kidProfileId, kidProfileId),
        gte(screenTimeSessions.startedAt, from),
        lt(screenTimeSessions.startedAt, to),
      ),
    );
  return rows.map((r) => r.s);
}

export type {
  ScreenTimeRule,
  NewScreenTimeRule,
  ScreenTimeSession,
  NewScreenTimeSession,
} from '../schema';
