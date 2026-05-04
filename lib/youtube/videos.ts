import 'server-only';
import { parseISO8601Duration, youtubeFetch } from './client';
import type { MaxContentRating } from '@/db/schema';
import type { RatingSignal } from '@/lib/kid/viewingRules';

export type VideoMetadata = {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number;
  rating: RatingSignal;
};

type VideoItem = {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
  };
  contentDetails: {
    duration: string;
    contentRating?: {
      tvpgRating?: string;
      mpaaRating?: string;
      ytRating?: string;
    };
  };
  status?: { madeForKids?: boolean };
};

type VideosListResponse = { items?: VideoItem[]; nextPageToken?: string };

type ChannelContentDetailsResponse = {
  items?: Array<{
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
};

type PlaylistItemsResponse = {
  items?: Array<{
    snippet: { resourceId: { videoId: string } };
  }>;
};

function mapVideoItem(item: VideoItem): VideoMetadata {
  const t = item.snippet.thumbnails;
  const cr = item.contentDetails.contentRating ?? {};
  return {
    videoId: item.id,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: t.high?.url ?? t.medium?.url ?? t.default?.url ?? '',
    publishedAt: item.snippet.publishedAt,
    durationSeconds: parseISO8601Duration(item.contentDetails.duration),
    rating: {
      tvpgRating: cr.tvpgRating ?? null,
      mpaaRating: cr.mpaaRating ?? null,
      ytRating: cr.ytRating ?? null,
      madeForKids: item.status?.madeForKids ?? null,
    },
  };
}

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
        part: 'snippet,contentDetails,status',
        id: chunk.join(','),
        maxResults: 50,
      },
    });
    for (const item of data.items ?? []) {
      out.push(mapVideoItem(item));
    }
  }
  return out;
}

const DISCOVERY_CATEGORY_IDS = ['10', '15', '20', '26', '27', '28'] as const;

const KIDS_DISCOVERY_QUERIES = [
  'kids songs',
  'nursery rhymes',
  'cartoons for kids',
  'kids learning',
  'kids stories',
  'preschool videos',
] as const;

export type DiscoveryPageTokens = Record<string, string | null>;

export type DiscoveryPage = {
  videos: VideoMetadata[];
  nextTokens: DiscoveryPageTokens;
  hasMore: boolean;
};

type SearchIdsResponse = {
  items?: Array<{ id: { videoId?: string } }>;
  nextPageToken?: string;
};

async function listKidsDiscoveryVideos(
  tokens: DiscoveryPageTokens,
): Promise<DiscoveryPage> {
  const results = await Promise.all(
    KIDS_DISCOVERY_QUERIES.map(async (q) => {
      const token = tokens[q];
      if (token === null) {
        return { key: q, ids: [] as string[], nextPageToken: null as string | null };
      }
      try {
        const data = await youtubeFetch<SearchIdsResponse>({
          path: '/search',
          params: {
            part: 'id',
            type: 'video',
            safeSearch: 'strict',
            videoEmbeddable: 'true',
            q,
            maxResults: 10,
            pageToken: token ?? undefined,
          },
          revalidateSeconds: 3600,
        });
        return {
          key: q,
          ids: (data.items ?? [])
            .map((i) => i.id.videoId)
            .filter((v): v is string => !!v),
          nextPageToken: data.nextPageToken ?? null,
        };
      } catch (err) {
        console.warn(
          `[kids discovery] query "${q}" failed:`,
          err instanceof Error ? err.message : err,
        );
        return { key: q, ids: [] as string[], nextPageToken: null as string | null };
      }
    }),
  );
  const seen = new Set<string>();
  const allIds: string[] = [];
  const nextTokens: DiscoveryPageTokens = {};
  for (const r of results) {
    for (const id of r.ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      allIds.push(id);
    }
    nextTokens[r.key] = r.nextPageToken;
  }
  const videos = await listVideoMetadata(allIds);
  const orderById = new Map(allIds.map((id, i) => [id, i] as const));
  videos.sort(
    (a, b) =>
      (orderById.get(a.videoId) ?? 0) - (orderById.get(b.videoId) ?? 0),
  );
  const hasMore = Object.values(nextTokens).some((t) => t !== null);
  return { videos, nextTokens, hasMore };
}

export async function listDiscoveryVideos(
  tokens: DiscoveryPageTokens = {},
  options: { maxRating?: MaxContentRating; regionCode?: string } = {},
): Promise<DiscoveryPage> {
  if (options.maxRating === 'tv_y' || options.maxRating === 'tv_y7') {
    return listKidsDiscoveryVideos(tokens);
  }
  const regionCode = options.regionCode ?? 'US';
  const results = await Promise.all(
    DISCOVERY_CATEGORY_IDS.map(async (categoryId) => {
      const token = tokens[categoryId];
      if (token === null) {
        return { categoryId, data: { items: [] } as VideosListResponse };
      }
      try {
        const data = await youtubeFetch<VideosListResponse>({
          path: '/videos',
          params: {
            part: 'snippet,contentDetails,status',
            chart: 'mostPopular',
            regionCode,
            videoCategoryId: categoryId,
            maxResults: 25,
            pageToken: token ?? undefined,
          },
          revalidateSeconds: 3600,
        });
        return { categoryId, data };
      } catch (err) {
        console.warn(
          `[discovery] category ${categoryId} failed:`,
          err instanceof Error ? err.message : err,
        );
        return { categoryId, data: { items: [] } as VideosListResponse };
      }
    }),
  );
  const seen = new Set<string>();
  const out: VideoMetadata[] = [];
  const nextTokens: DiscoveryPageTokens = {};
  for (const { categoryId, data } of results) {
    for (const item of data.items ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(mapVideoItem(item));
    }
    nextTokens[categoryId] = data.nextPageToken ?? null;
  }
  const hasMore = Object.values(nextTokens).some((t) => t !== null);
  return { videos: out, nextTokens, hasMore };
}

export async function listChannelRailVideos(
  channelId: string,
  max = 24,
): Promise<VideoMetadata[]> {
  const channelData = await youtubeFetch<ChannelContentDetailsResponse>({
    path: '/channels',
    params: { part: 'contentDetails', id: channelId, maxResults: 1 },
    revalidateSeconds: 3600,
  });
  const uploadsId =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return [];
  const playlistData = await youtubeFetch<PlaylistItemsResponse>({
    path: '/playlistItems',
    params: { part: 'snippet', playlistId: uploadsId, maxResults: max },
    revalidateSeconds: 1800,
  });
  const videoIds = (playlistData.items ?? []).map(
    (i) => i.snippet.resourceId.videoId,
  );
  if (videoIds.length === 0) return [];
  return listVideoMetadata(videoIds);
}
