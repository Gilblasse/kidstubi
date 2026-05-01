import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  approvedVideos,
  kidProfiles,
  pendingVideoApprovals,
  type PendingApprovalResolution,
  type PendingApprovalSource,
  type PendingVideoApproval,
} from '../schema';

export async function listPendingApprovalsForKid(
  parentId: string,
  kidProfileId: string,
  source?: PendingApprovalSource,
): Promise<PendingVideoApproval[]> {
  const rows = await getDb()
    .select({ p: pendingVideoApprovals })
    .from(pendingVideoApprovals)
    .innerJoin(kidProfiles, eq(pendingVideoApprovals.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(pendingVideoApprovals.kidProfileId, kidProfileId),
        isNull(pendingVideoApprovals.resolvedAt),
        ...(source ? [eq(pendingVideoApprovals.source, source)] : []),
      ),
    )
    .orderBy(asc(pendingVideoApprovals.requestedAt));
  return rows.map((r) => r.p);
}

export async function listAllPendingApprovalsForParent(
  parentId: string,
): Promise<PendingVideoApproval[]> {
  const rows = await getDb()
    .select({ p: pendingVideoApprovals })
    .from(pendingVideoApprovals)
    .innerJoin(kidProfiles, eq(pendingVideoApprovals.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        isNull(pendingVideoApprovals.resolvedAt),
      ),
    )
    .orderBy(asc(pendingVideoApprovals.requestedAt));
  return rows.map((r) => r.p);
}

export async function insertPendingApproval(input: {
  kidProfileId: string;
  youtubeVideoId: string;
  source: PendingApprovalSource;
}): Promise<PendingVideoApproval | null> {
  const db = getDb();
  const existing = await db
    .select({ id: pendingVideoApprovals.id })
    .from(pendingVideoApprovals)
    .where(
      and(
        eq(pendingVideoApprovals.kidProfileId, input.kidProfileId),
        eq(pendingVideoApprovals.youtubeVideoId, input.youtubeVideoId),
        isNull(pendingVideoApprovals.resolvedAt),
      ),
    )
    .limit(1);
  if (existing[0]) return null;

  const alreadyApproved = await db
    .select({ id: approvedVideos.id })
    .from(approvedVideos)
    .where(
      and(
        eq(approvedVideos.kidProfileId, input.kidProfileId),
        eq(approvedVideos.youtubeVideoId, input.youtubeVideoId),
      ),
    )
    .limit(1);
  if (alreadyApproved[0]) return null;

  const rows = await db
    .insert(pendingVideoApprovals)
    .values({
      kidProfileId: input.kidProfileId,
      youtubeVideoId: input.youtubeVideoId,
      source: input.source,
    })
    .returning();
  return rows[0] ?? null;
}

export async function resolvePendingApproval(
  parentId: string,
  pendingId: string,
  resolution: PendingApprovalResolution,
): Promise<PendingVideoApproval | null> {
  const db = getDb();
  const found = await db
    .select({ p: pendingVideoApprovals })
    .from(pendingVideoApprovals)
    .innerJoin(kidProfiles, eq(pendingVideoApprovals.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(pendingVideoApprovals.id, pendingId),
        eq(kidProfiles.parentId, parentId),
        isNull(pendingVideoApprovals.resolvedAt),
      ),
    )
    .limit(1);
  if (!found[0]) return null;
  const rows = await db
    .update(pendingVideoApprovals)
    .set({ resolution, resolvedAt: new Date() })
    .where(eq(pendingVideoApprovals.id, pendingId))
    .returning();
  return rows[0] ?? null;
}

export async function countPendingForParent(parentId: string): Promise<number> {
  const rows = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(pendingVideoApprovals)
    .innerJoin(kidProfiles, eq(pendingVideoApprovals.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        isNull(pendingVideoApprovals.resolvedAt),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

export {
  PENDING_APPROVAL_SOURCES,
  PENDING_APPROVAL_RESOLUTIONS,
  type PendingVideoApproval,
  type NewPendingVideoApproval,
  type PendingApprovalSource,
  type PendingApprovalResolution,
} from '../schema';
