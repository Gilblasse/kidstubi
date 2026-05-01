import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import {
  approvedChannels,
  kidProfiles,
  type ApprovedChannel,
} from '../schema';

export async function listApprovedChannelsForKid(
  parentId: string,
  kidProfileId: string,
): Promise<ApprovedChannel[]> {
  const rows = await getDb()
    .select({ c: approvedChannels })
    .from(approvedChannels)
    .innerJoin(kidProfiles, eq(approvedChannels.kidProfileId, kidProfiles.id))
    .where(
      and(
        eq(kidProfiles.parentId, parentId),
        eq(approvedChannels.kidProfileId, kidProfileId),
      ),
    )
    .orderBy(desc(approvedChannels.addedAt));
  return rows.map((r) => r.c);
}

export async function addApprovedChannel(
  parentId: string,
  kidProfileId: string,
  input: { youtubeChannelId: string; channelTitle: string },
): Promise<ApprovedChannel> {
  const kid = await getDb()
    .select({ id: kidProfiles.id })
    .from(kidProfiles)
    .where(and(eq(kidProfiles.id, kidProfileId), eq(kidProfiles.parentId, parentId)))
    .limit(1);
  if (!kid[0]) throw new Error('kid_profile not found for parent');
  const rows = await getDb()
    .insert(approvedChannels)
    .values({
      kidProfileId,
      youtubeChannelId: input.youtubeChannelId,
      channelTitle: input.channelTitle,
    })
    .returning();
  return rows[0]!;
}

export type ApprovedChannelRow = {
  kidProfileId: string;
  youtubeChannelId: string;
  channelTitle: string;
};

export async function listAllApprovedChannelsAcrossTenants(): Promise<
  ApprovedChannelRow[]
> {
  const rows = await getDb()
    .select({
      kidProfileId: approvedChannels.kidProfileId,
      youtubeChannelId: approvedChannels.youtubeChannelId,
      channelTitle: approvedChannels.channelTitle,
    })
    .from(approvedChannels);
  return rows;
}

export type { ApprovedChannel, NewApprovedChannel } from '../schema';
