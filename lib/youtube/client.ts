import 'server-only';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not set');
  return key;
}

export type YouTubeFetchOptions = {
  path: string;
  params: Record<string, string | number | undefined>;
  revalidateSeconds?: number;
};

export async function youtubeFetch<T>({
  path,
  params,
  revalidateSeconds = 300,
}: YouTubeFetchOptions): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('key', getApiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`YouTube API ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export function parseISO8601Duration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, h = '0', mi = '0', s = '0'] = m;
  return Number(h) * 3600 + Number(mi) * 60 + Number(s);
}
