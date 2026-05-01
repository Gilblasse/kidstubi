import 'server-only';
import { youtubeFetch } from './client';

export type SearchResult = {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
};

type SearchListResponse = {
  items?: Array<{
    id: { videoId?: string };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelId: string;
      channelTitle: string;
      thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
    };
  }>;
};

export async function searchVideosSafe(
  query: string,
  maxResults = 24,
): Promise<SearchResult[]> {
  const data = await youtubeFetch<SearchListResponse>({
    path: '/search',
    params: {
      part: 'snippet',
      type: 'video',
      safeSearch: 'strict',
      q: query,
      maxResults,
    },
    revalidateSeconds: 60,
  });
  const items = data.items ?? [];
  return items
    .filter((i): i is typeof i & { id: { videoId: string } } => !!i.id.videoId)
    .map((i) => {
      const t = i.snippet.thumbnails;
      return {
        videoId: i.id.videoId,
        channelId: i.snippet.channelId,
        channelTitle: i.snippet.channelTitle,
        title: i.snippet.title,
        description: i.snippet.description,
        thumbnailUrl: t.high?.url ?? t.medium?.url ?? t.default?.url ?? '',
        publishedAt: i.snippet.publishedAt,
      };
    });
}
