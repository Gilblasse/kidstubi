import type { MaxContentRating } from '@/db/schema';
import { MAX_CONTENT_RATINGS } from '@/db/schema';

export type RatingSignal = {
  tvpgRating?: string | null;
  mpaaRating?: string | null;
  ytRating?: string | null;
  madeForKids?: boolean | null;
};

const TIER_RANK: Record<MaxContentRating, number> = {
  tv_y: 1,
  tv_y7: 2,
  tv_g: 3,
  tv_pg: 4,
  tv_14: 5,
  tv_ma: 6,
  unrestricted: 7,
};

const TVPG_TO_TIER: Record<string, MaxContentRating> = {
  pg1: 'tv_y',
  pg2: 'tv_y7',
  pg3: 'tv_g',
  pg4: 'tv_pg',
  pg5: 'tv_14',
  pg6: 'tv_ma',
};

const MPAA_TO_TIER: Record<string, MaxContentRating> = {
  mpaaG: 'tv_g',
  mpaaPg: 'tv_pg',
  mpaaPg13: 'tv_14',
  mpaaR: 'tv_ma',
  mpaaNc17: 'tv_ma',
};

export const RATING_LABELS: Record<MaxContentRating, string> = {
  tv_y: 'TV-Y · all kids',
  tv_y7: 'TV-Y7 · 7+',
  tv_g: 'TV-G / G · general audiences',
  tv_pg: 'TV-PG / PG · parental guidance',
  tv_14: 'TV-14 / PG-13 · teen',
  tv_ma: 'TV-MA / R · mature',
  unrestricted: 'Unrestricted · no rating filter',
};

export function isMaxContentRating(value: unknown): value is MaxContentRating {
  return (
    typeof value === 'string' &&
    (MAX_CONTENT_RATINGS as readonly string[]).includes(value)
  );
}

export function normalizeRating(s: RatingSignal): MaxContentRating {
  if (s.ytRating === 'ytAgeRestricted') return 'tv_ma';
  if (s.tvpgRating && TVPG_TO_TIER[s.tvpgRating])
    return TVPG_TO_TIER[s.tvpgRating]!;
  if (s.mpaaRating && MPAA_TO_TIER[s.mpaaRating])
    return MPAA_TO_TIER[s.mpaaRating]!;
  if (s.madeForKids === true) return 'tv_y';
  return 'tv_g';
}

export function isAllowedTier(
  videoTier: MaxContentRating,
  kidMax: MaxContentRating,
): boolean {
  if (kidMax === 'unrestricted') return true;
  return TIER_RANK[videoTier] <= TIER_RANK[kidMax];
}

export type ViewingRules = {
  maxRating: MaxContentRating;
  kidKeywords: string[];
  parentKeywords: string[];
};

export type VideoForRules = {
  title: string;
  description: string;
  channelTitle: string;
  rating: RatingSignal;
};

export type RuleResult = { allowed: true } | { allowed: false; reason: 'rating' | 'keyword' };

function keywordHits(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function isVideoAllowed(
  video: VideoForRules,
  rules: ViewingRules,
): RuleResult {
  const allKeywords = [...rules.parentKeywords, ...rules.kidKeywords];
  if (
    keywordHits(video.title, allKeywords) ||
    keywordHits(video.description, allKeywords) ||
    keywordHits(video.channelTitle, allKeywords)
  ) {
    return { allowed: false, reason: 'keyword' };
  }
  const tier = normalizeRating(video.rating);
  if (!isAllowedTier(tier, rules.maxRating)) {
    return { allowed: false, reason: 'rating' };
  }
  return { allowed: true };
}
