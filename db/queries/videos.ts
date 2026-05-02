import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../client';
import {
  approvedVideos,
  kidProfiles,
  type ApprovedVideo,
  type NewApprovedVideo,
} from '../schema';

export async function listApprovedVideosForKid(
  parentId: string,
  kidProfileId: string,
): Promise<ApprovedVideo[]> {
  const rows = await getDb()
    .select({ v: approvedVideos })
    .from(approvedVideos)
    .innerJoin(kidProfiles, eq(approvedVideos.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(approvedVideos.kidProfileId, kidProfileId),
      ),
    )
    .orderBy(desc(approvedVideos.approvedAt));
  return rows.map((r) => r.v);
}

export async function listApprovedVideosForChannel(
  parentId: string,
  kidProfileId: string,
  youtubeChannelId: string,
): Promise<ApprovedVideo[]> {
  const rows = await getDb()
    .select({ v: approvedVideos })
    .from(approvedVideos)
    .innerJoin(kidProfiles, eq(approvedVideos.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(approvedVideos.kidProfileId, kidProfileId),
        eq(approvedVideos.channelId, youtubeChannelId),
      ),
    )
    .orderBy(desc(approvedVideos.approvedAt));
  return rows.map((r) => r.v);
}

export async function getApprovedVideo(
  parentId: string,
  kidProfileId: string,
  youtubeVideoId: string,
): Promise<ApprovedVideo | null> {
  const rows = await getDb()
    .select({ v: approvedVideos })
    .from(approvedVideos)
    .innerJoin(kidProfiles, eq(approvedVideos.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(approvedVideos.kidProfileId, kidProfileId),
        eq(approvedVideos.youtubeVideoId, youtubeVideoId),
      ),
    )
    .limit(1);
  return rows[0]?.v ?? null;
}

export async function bulkInsertApprovedVideos(
  parentId: string,
  kidProfileId: string,
  videos: Array<Omit<NewApprovedVideo, 'id' | 'kidProfileId' | 'approvedAt'>>,
): Promise<ApprovedVideo[]> {
  if (videos.length === 0) return [];
  const kid = await getDb()
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)))
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  return getDb()
    .insert(approvedVideos)
    .values(videos.map((v) => ({ ...v, kidProfileId })))
    .returning();
}

export async function deleteApprovedVideosByIds(
  parentId: string,
  kidProfileId: string,
  youtubeVideoIds: string[],
): Promise<number> {
  if (youtubeVideoIds.length === 0) return 0;
  const kid = await getDb()
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)))
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  const rows = await getDb()
    .delete(approvedVideos)
    .where(
      and(
        eq(approvedVideos.kidProfileId, kidProfileId),
        inArray(approvedVideos.youtubeVideoId, youtubeVideoIds),
      ),
    )
    .returning({ id: approvedVideos.id });
  return rows.length;
}

export type { ApprovedVideo, NewApprovedVideo } from '../schema';
