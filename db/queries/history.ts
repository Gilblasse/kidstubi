import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import {
  approvedVideos,
  kidProfiles,
  watchHistory,
  type WatchHistoryEntry,
} from '../schema';

export async function recordWatch(input: {
  parentId: string;
  kidProfileId: string;
  youtubeVideoId: string;
  secondsWatched: number;
}): Promise<void> {
  const gate = await getDb()
    .select({ id: approvedVideos.id })
    .from(approvedVideos)
    .innerJoin(kidProfiles, eq(approvedVideos.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, input.parentId),
        eq(approvedVideos.kidProfileId, input.kidProfileId),
        eq(approvedVideos.youtubeVideoId, input.youtubeVideoId),
      ),
    )
    .limit(1);
  if (!gate[0]) throw new Error('video not approved for this kid');
  await getDb().insert(watchHistory).values({
    kidProfileId: input.kidProfileId,
    youtubeVideoId: input.youtubeVideoId,
    secondsWatched: input.secondsWatched,
  });
}

export async function listWatchHistoryForKid(
  parentId: string,
  kidProfileId: string,
): Promise<WatchHistoryEntry[]> {
  const rows = await getDb()
    .select({ w: watchHistory })
    .from(watchHistory)
    .innerJoin(kidProfiles, eq(watchHistory.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(watchHistory.kidProfileId, kidProfileId),
      ),
    )
    .orderBy(desc(watchHistory.watchedAt));
  return rows.map((r) => r.w);
}

export type { WatchHistoryEntry, NewWatchHistoryEntry } from '../schema';
