import 'server-only';
import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  approvedChannels,
  kidProfiles,
  pendingVideoApprovals,
  screenTimeRules,
  screenTimeSessions,
  searchHistory,
  watchHistory,
  type KidProfile,
  type NewKidProfile,
} from '../schema';

export async function listKidProfilesForParent(parentId: string): Promise<KidProfile[]> {
  return getDb().select().from(kidProfiles).where(eq(kidProfiles.parentId, parentId));
}

export async function getKidProfileByIdForParent(
  parentId: string,
  kidProfileId: string,
): Promise<KidProfile | null> {
  const rows = await getDb()
    .select()
    .from(kidProfiles)
    .where(and(eq(kidProfiles.parentId, parentId), eq(kidProfiles.id, kidProfileId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createKidProfile(
  parentId: string,
  input: Omit<NewKidProfile, 'id' | 'parentId' | 'createdAt'>,
): Promise<KidProfile> {
  const rows = await getDb()
    .insert(kidProfiles)
    .values({ ...input, parentId })
    .returning();
  return rows[0]!;
}

export async function updateKidSearchSettings(
  parentId: string,
  kidProfileId: string,
  patch: { searchEnabled?: boolean; liveSearchAlerts?: boolean },
): Promise<void> {
  await getDb()
    .update(kidProfiles)
    .set(patch)
    .where(
      and(
        eq(kidProfiles.id, kidProfileId),
        eq(kidProfiles.parentId, parentId),
      ),
    );
}

export async function updateKidAvatar(
  parentId: string,
  kidProfileId: string,
  avatarUrl: string,
): Promise<void> {
  await getDb()
    .update(kidProfiles)
    .set({ avatarUrl })
    .where(
      and(
        eq(kidProfiles.id, kidProfileId),
        eq(kidProfiles.parentId, parentId),
      ),
    );
}

export type KidDashboardStats = {
  kidProfileId: string;
  channelsCount: number;
  pendingApprovalsCount: number;
  watchHistoryCount: number;
  lastWatchedAt: Date | null;
  searchesLast7Days: number;
  usageTodaySeconds: number;
  allowedTodayMinutes: number;
};

const ORPHAN_SESSION_CAP_SECONDS = 4 * 60 * 60;

export async function getKidDashboardStats(
  parentId: string,
  now: Date = new Date(),
): Promise<Map<string, KidDashboardStats>> {
  const db = getDb();

  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayDow = now.getUTCDay();

  const [
    channels,
    pending,
    watchAgg,
    searches,
    sessions,
    openSessions,
    rules,
  ] = await Promise.all([
    db
      .select({
        kidProfileId: approvedChannels.kidProfileId,
        count: sql<number>`count(*)::int`,
      })
      .from(approvedChannels)
      .innerJoin(kidProfiles, eq(approvedChannels.kidProfileId, kidProfiles.id))
      .where(eq(kidProfiles.parentId, parentId))
      .groupBy(approvedChannels.kidProfileId),

    db
      .select({
        kidProfileId: pendingVideoApprovals.kidProfileId,
        count: sql<number>`count(*)::int`,
      })
      .from(pendingVideoApprovals)
      .innerJoin(
        kidProfiles,
        eq(pendingVideoApprovals.kidProfileId, kidProfiles.id),
      )
      .where(
        and(
          eq(kidProfiles.parentId, parentId),
          isNull(pendingVideoApprovals.resolvedAt),
        ),
      )
      .groupBy(pendingVideoApprovals.kidProfileId),

    db
      .select({
        kidProfileId: watchHistory.kidProfileId,
        count: sql<number>`count(*)::int`,
        lastWatchedAt: sql<Date | null>`max(${watchHistory.watchedAt})`,
      })
      .from(watchHistory)
      .innerJoin(kidProfiles, eq(watchHistory.kidProfileId, kidProfiles.id))
      .where(eq(kidProfiles.parentId, parentId))
      .groupBy(watchHistory.kidProfileId),

    db
      .select({
        kidProfileId: searchHistory.kidProfileId,
        count: sql<number>`count(*)::int`,
      })
      .from(searchHistory)
      .innerJoin(kidProfiles, eq(searchHistory.kidProfileId, kidProfiles.id))
      .where(
        and(
          eq(kidProfiles.parentId, parentId),
          gte(searchHistory.searchedAt, sevenDaysAgo),
        ),
      )
      .groupBy(searchHistory.kidProfileId),

    db
      .select({
        kidProfileId: screenTimeSessions.kidProfileId,
        total: sql<number>`coalesce(sum(${screenTimeSessions.secondsUsed})::int, 0)`,
      })
      .from(screenTimeSessions)
      .innerJoin(
        kidProfiles,
        eq(screenTimeSessions.kidProfileId, kidProfiles.id),
      )
      .where(
        and(
          eq(kidProfiles.parentId, parentId),
          gte(screenTimeSessions.startedAt, dayStart),
          lt(screenTimeSessions.startedAt, dayEnd),
        ),
      )
      .groupBy(screenTimeSessions.kidProfileId),

    db
      .select({
        kidProfileId: screenTimeSessions.kidProfileId,
        startedAt: screenTimeSessions.startedAt,
      })
      .from(screenTimeSessions)
      .innerJoin(
        kidProfiles,
        eq(screenTimeSessions.kidProfileId, kidProfiles.id),
      )
      .where(
        and(
          eq(kidProfiles.parentId, parentId),
          isNull(screenTimeSessions.endedAt),
          gte(screenTimeSessions.startedAt, dayStart),
          lt(screenTimeSessions.startedAt, dayEnd),
        ),
      ),

    db
      .select({
        kidProfileId: screenTimeRules.kidProfileId,
        minutes: screenTimeRules.allowedMinutes,
      })
      .from(screenTimeRules)
      .innerJoin(kidProfiles, eq(screenTimeRules.kidProfileId, kidProfiles.id))
      .where(
        and(
          eq(kidProfiles.parentId, parentId),
          eq(screenTimeRules.dayOfWeek, todayDow),
        ),
      ),
  ]);

  const out = new Map<string, KidDashboardStats>();
  const ensure = (id: string): KidDashboardStats => {
    let s = out.get(id);
    if (!s) {
      s = {
        kidProfileId: id,
        channelsCount: 0,
        pendingApprovalsCount: 0,
        watchHistoryCount: 0,
        lastWatchedAt: null,
        searchesLast7Days: 0,
        usageTodaySeconds: 0,
        allowedTodayMinutes: 0,
      };
      out.set(id, s);
    }
    return s;
  };

  for (const r of channels) ensure(r.kidProfileId).channelsCount = Number(r.count);
  for (const r of pending) ensure(r.kidProfileId).pendingApprovalsCount = Number(r.count);
  for (const r of watchAgg) {
    const s = ensure(r.kidProfileId);
    s.watchHistoryCount = Number(r.count);
    s.lastWatchedAt = r.lastWatchedAt ? new Date(r.lastWatchedAt) : null;
  }
  for (const r of searches) ensure(r.kidProfileId).searchesLast7Days = Number(r.count);
  for (const r of sessions) ensure(r.kidProfileId).usageTodaySeconds = Number(r.total);
  for (const r of openSessions) {
    const elapsed = Math.floor((now.getTime() - r.startedAt.getTime()) / 1000);
    const capped = Math.min(Math.max(elapsed, 0), ORPHAN_SESSION_CAP_SECONDS);
    ensure(r.kidProfileId).usageTodaySeconds += capped;
  }
  for (const r of rules) ensure(r.kidProfileId).allowedTodayMinutes = r.minutes;

  return out;
}

export type { KidProfile, NewKidProfile } from '../schema';
