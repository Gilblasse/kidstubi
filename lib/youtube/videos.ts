import 'server-only';
import { parseISO8601Duration, youtubeFetch } from './client';

export type VideoMetadata = {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number;
};

type VideosListResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelId: string;
      channelTitle: string;
      thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
    };
    contentDetails: { duration: string };
  }>;
};

export async function getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  const [item] = await listVideoMetadata([videoId]);
  return item ?? null;
}

export async function listVideoMetadata(
  videoIds: string[],
): Promise<VideoMetadata[]> {
  if (videoIds.length === 0) return [];
  const unique = Array.from(new Set(videoIds));
  const out: VideoMetadata[] = [];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const data = await youtubeFetch<VideosListResponse>({
      path: '/videos',
      params: {
        part: 'snippet,contentDetails',
        id: chunk.join(','),
        maxResults: 50,
      },
    });
    for (const item of data.items ?? []) {
      const t = item.snippet.thumbnails;
      out.push({
        videoId: item.id,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: t.high?.url ?? t.medium?.url ?? t.default?.url ?? '',
        publishedAt: item.snippet.publishedAt,
        durationSeconds: parseISO8601Duration(item.contentDetails.duration),
      });
    }
  }
  return out;
}
