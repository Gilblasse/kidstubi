import { getDb } from './client';
import {
  approvedChannels,
  approvedVideos,
  kidProfiles,
  parents,
} from './schema';

async function main() {
  const db = getDb();

  await db.delete(parents);

  const [parent] = await db
    .insert(parents)
    .values({ clerkUserId: 'seed_dev_clerk_user', email: 'dev@kidtube.test' })
    .returning();
  if (!parent) throw new Error('Failed to seed parent');

  const kids = await db
    .insert(kidProfiles)
    .values([
      { parentId: parent.id, displayName: 'Mika' },
      { parentId: parent.id, displayName: 'Teo', searchEnabled: false },
    ])
    .returning();
  const [mika, teo] = kids;
  if (!mika || !teo) throw new Error('Failed to seed kid profiles');

  await db.insert(approvedChannels).values([
    {
      kidProfileId: mika.id,
      youtubeChannelId: 'UCsooa4yRKGN_zEE8iknghZA',
      channelTitle: 'TED-Ed',
    },
    {
      kidProfileId: mika.id,
      youtubeChannelId: 'UCsXVk37bltHxD1rDPwtNM8Q',
      channelTitle: 'Kurzgesagt',
    },
    {
      kidProfileId: teo.id,
      youtubeChannelId: 'UCsooa4yRKGN_zEE8iknghZA',
      channelTitle: 'TED-Ed',
    },
  ]);

  await db.insert(approvedVideos).values([
    {
      kidProfileId: mika.id,
      youtubeVideoId: 'dev_vid_1',
      channelId: 'UCsooa4yRKGN_zEE8iknghZA',
      title: 'How do we know how old the Earth is?',
      thumbnailUrl: 'https://i.ytimg.com/vi/dev_vid_1/hqdefault.jpg',
      durationSeconds: 287,
    },
    {
      kidProfileId: mika.id,
      youtubeVideoId: 'dev_vid_2',
      channelId: 'UCsXVk37bltHxD1rDPwtNM8Q',
      title: 'The Ocean is Way Deeper Than You Think',
      thumbnailUrl: 'https://i.ytimg.com/vi/dev_vid_2/hqdefault.jpg',
      durationSeconds: 324,
    },
    {
      kidProfileId: teo.id,
      youtubeVideoId: 'dev_vid_3',
      channelId: 'UCsooa4yRKGN_zEE8iknghZA',
      title: 'Why do we dream?',
      thumbnailUrl: 'https://i.ytimg.com/vi/dev_vid_3/hqdefault.jpg',
      durationSeconds: 265,
    },
  ]);

  console.log(`Seeded parent=${parent.id}, kids=${mika.id},${teo.id}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
