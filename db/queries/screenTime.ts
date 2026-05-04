import 'server-only';
import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  kidProfiles,
  screenTimeRules,
  screenTimeSessions,
  screenTimeWindows,
  type ScreenTimeRule,
  type ScreenTimeSession,
  type ScreenTimeWindow,
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

export async function listScreenTimeWindowsForKid(
  parentId: string,
  kidProfileId: string,
): Promise<ScreenTimeWindow[]> {
  const rows = await getDb()
    .select({ w: screenTimeWindows })
    .from(screenTimeWindows)
    .innerJoin(kidProfiles, eq(screenTimeWindows.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(screenTimeWindows.kidProfileId, kidProfileId),
      ),
    )
    .orderBy(asc(screenTimeWindows.dayOfWeek), asc(screenTimeWindows.startMinute));
  return rows.map((r) => r.w);
}

export async function replaceScreenTimeWindows(
  parentId: string,
  kidProfileId: string,
  windowsByDay: Record<number, Array<{ startMinute: number; endMinute: number }>>,
): Promise<void> {
  const db = getDb();
  const kid = await db
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)))
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  await db
    .delete(screenTimeWindows)
    .where(eq(screenTimeWindows.kidProfileId, kidProfileId));
  const rows: Array<{
    kidProfileId: string;
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  }> = [];
  for (const [dayStr, list] of Object.entries(windowsByDay)) {
    const dow = Number(dayStr);
    if (!(dow >= 0 && dow <= 6)) continue;
    for (const w of list) {
      const start = Math.round(w.startMinute / 15) * 15;
      const end = Math.round(w.endMinute / 15) * 15;
      if (start < 0 || end > 1440 || start >= end) continue;
      rows.push({ kidProfileId, dayOfWeek: dow, startMinute: start, endMinute: end });
    }
  }
  if (rows.length > 0) {
    await db.insert(screenTimeWindows).values(rows);
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
  withinAllowedWindow: boolean;
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

  const windowRows = await db
    .select({
      s: screenTimeWindows.startMinute,
      e: screenTimeWindows.endMinute,
    })
    .from(screenTimeWindows)
    .where(
      and(
        eq(screenTimeWindows.kidProfileId, kidProfileId),
        eq(screenTimeWindows.dayOfWeek, dow),
      ),
    );
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const withinAllowedWindow =
    windowRows.length === 0 ||
    windowRows.some((w) => nowMinutes >= w.s && nowMinutes < w.e);

  return { remainingSeconds, allowedMinutes, usedSeconds, withinAllowedWindow };
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
  ScreenTimeWindow,
  NewScreenTimeWindow,
} from '../schema';
