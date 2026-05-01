import 'server-only';
import { parseISO8601Duration, youtubeFetch } from './client';

export type ChannelMetadata = {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl: string | null;
  uploadsPlaylistId: string;
  subscriberCount: number | null;
};

export type ChannelVideo = {
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number;
};

export type ChannelVideosPage = {
  videos: ChannelVideo[];
  nextPageToken: string | null;
  totalResults: number;
};

type ChannelListResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
    };
    contentDetails: { relatedPlaylists: { uploads: string } };
    statistics?: { subscriberCount?: string };
    brandingSettings?: { image?: { bannerExternalUrl?: string } };
  }>;
};

type PlaylistItemsResponse = {
  items?: Array<{
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelId: string;
      thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
      resourceId: { videoId: string };
    };
  }>;
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
};

type VideosListResponse = {
  items?: Array<{
    id: string;
    contentDetails: { duration: string };
  }>;
};

function pickThumbnail(thumbs: {
  default?: { url: string };
  medium?: { url: string };
  high?: { url: string };
}): string {
  return thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? '';
}

const URL_PATTERNS = [
  /youtube\.com\/channel\/(UC[\w-]{20,})/i,
  /youtube\.com\/@([\w.-]+)/i,
  /youtube\.com\/c\/([\w.-]+)/i,
  /youtube\.com\/user\/([\w.-]+)/i,
];

export async function getChannelByIdOrUrl(
  input: string,
): Promise<ChannelMetadata | null> {
  const trimmed = input.trim();
  let channelId: string | null = null;
  let handle: string | null = null;

  if (/^UC[\w-]{20,}$/.test(trimmed)) {
    channelId = trimmed;
  } else if (trimmed.startsWith('@')) {
    handle = trimmed.slice(1);
  } else {
    for (const re of URL_PATTERNS) {
      const m = re.exec(trimmed);
      if (m) {
        if (re === URL_PATTERNS[0]) channelId = m[1]!;
        else handle = m[1]!;
        break;
      }
    }
  }

  if (!channelId && !handle) return null;

  const data = await youtubeFetch<ChannelListResponse>({
    path: '/channels',
    params: {
      part: 'snippet,contentDetails,statistics,brandingSettings',
      ...(channelId ? { id: channelId } : { forHandle: handle ?? '' }),
      maxResults: 1,
    },
  });

  const item = data.items?.[0];
  if (!item) return null;

  return {
    channelId: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: pickThumbnail(item.snippet.thumbnails),
    bannerUrl: item.brandingSettings?.image?.bannerExternalUrl ?? null,
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    subscriberCount: item.statistics?.subscriberCount
      ? Number(item.statistics.subscriberCount)
      : null,
  };
}

export async function listChannelVideos(
  uploadsPlaylistId: string,
  pageToken?: string,
): Promise<ChannelVideosPage> {
  const playlistData = await youtubeFetch<PlaylistItemsResponse>({
    path: '/playlistItems',
    params: {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken,
    },
  });

  const items = playlistData.items ?? [];
  if (items.length === 0) {
    return {
      videos: [],
      nextPageToken: playlistData.nextPageToken ?? null,
      totalResults: playlistData.pageInfo?.totalResults ?? 0,
    };
  }

  const videoIds = items.map((i) => i.snippet.resourceId.videoId);
  const detailsData = await youtubeFetch<VideosListResponse>({
    path: '/videos',
    params: {
      part: 'contentDetails',
      id: videoIds.join(','),
    },
  });
  const durationsByVideoId = new Map(
    (detailsData.items ?? []).map((v) => [
      v.id,
      parseISO8601Duration(v.contentDetails.duration),
    ]),
  );

  return {
    videos: items.map((i) => ({
      videoId: i.snippet.resourceId.videoId,
      channelId: i.snippet.channelId,
      title: i.snippet.title,
      description: i.snippet.description,
      thumbnailUrl: pickThumbnail(i.snippet.thumbnails),
      publishedAt: i.snippet.publishedAt,
      durationSeconds: durationsByVideoId.get(i.snippet.resourceId.videoId) ?? 0,
    })),
    nextPageToken: playlistData.nextPageToken ?? null,
    totalResults: playlistData.pageInfo?.totalResults ?? 0,
  };
}
