import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const parents = pgTable('parents', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  pinHash: text('pin_hash'),
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kidProfiles = pgTable(
  'kid_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    searchEnabled: boolean('search_enabled').notNull().default(true),
    liveSearchAlerts: boolean('live_search_alerts').notNull().default(false),
    maxContentRating: text('max_content_rating').notNull().default('tv_g'),
    discoveryEnabled: boolean('discovery_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'kid_profiles_max_content_rating_check',
      sql`${t.maxContentRating} in ('tv_y', 'tv_y7', 'tv_g', 'tv_pg', 'tv_14', 'tv_ma', 'unrestricted')`,
    ),
  ],
);

export const approvedChannels = pgTable('approved_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidProfileId: uuid('kid_profile_id')
    .notNull()
    .references(() => kidProfiles.id, { onDelete: 'cascade' }),
  youtubeChannelId: text('youtube_channel_id').notNull(),
  channelTitle: text('channel_title').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
});

export const approvedVideos = pgTable('approved_videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidProfileId: uuid('kid_profile_id')
    .notNull()
    .references(() => kidProfiles.id, { onDelete: 'cascade' }),
  youtubeVideoId: text('youtube_video_id').notNull(),
  channelId: text('channel_id').notNull(),
  title: text('title').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  contentRating: text('content_rating'),
  madeForKids: boolean('made_for_kids'),
  visibleDays: integer('visible_days')
    .array()
    .notNull()
    .default([0, 1, 2, 3, 4, 5, 6]),
  approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pendingVideoApprovals = pgTable(
  'pending_video_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kidProfileId: uuid('kid_profile_id')
      .notNull()
      .references(() => kidProfiles.id, { onDelete: 'cascade' }),
    youtubeVideoId: text('youtube_video_id').notNull(),
    source: text('source').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolution: text('resolution'),
  },
  (t) => [
    check(
      'pending_video_approvals_source_check',
      sql`${t.source} in ('channel_upload', 'kid_search_request')`,
    ),
    check(
      'pending_video_approvals_resolution_check',
      sql`${t.resolution} is null or ${t.resolution} in ('approved', 'rejected')`,
    ),
  ],
);

export const watchHistory = pgTable('watch_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidProfileId: uuid('kid_profile_id')
    .notNull()
    .references(() => kidProfiles.id, { onDelete: 'cascade' }),
  youtubeVideoId: text('youtube_video_id').notNull(),
  watchedAt: timestamp('watched_at', { withTimezone: true }).notNull().defaultNow(),
  secondsWatched: integer('seconds_watched').notNull(),
});

export const searchHistory = pgTable('search_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidProfileId: uuid('kid_profile_id')
    .notNull()
    .references(() => kidProfiles.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  resultCount: integer('result_count').notNull(),
  searchedAt: timestamp('searched_at', { withTimezone: true }).notNull().defaultNow(),
});

export const screenTimeRules = pgTable(
  'screen_time_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kidProfileId: uuid('kid_profile_id')
      .notNull()
      .references(() => kidProfiles.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    allowedMinutes: integer('allowed_minutes').notNull(),
  },
  (t) => [
    check('screen_time_rules_day_of_week_check', sql`${t.dayOfWeek} between 0 and 6`),
  ],
);

export const screenTimeSessions = pgTable('screen_time_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidProfileId: uuid('kid_profile_id')
    .notNull()
    .references(() => kidProfiles.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  secondsUsed: integer('seconds_used').notNull().default(0),
});

export const screenTimeWindows = pgTable(
  'screen_time_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kidProfileId: uuid('kid_profile_id')
      .notNull()
      .references(() => kidProfiles.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
  },
  (t) => [
    check(
      'screen_time_windows_day_of_week_check',
      sql`${t.dayOfWeek} between 0 and 6`,
    ),
    check(
      'screen_time_windows_start_check',
      sql`${t.startMinute} between 0 and 1439`,
    ),
    check(
      'screen_time_windows_end_check',
      sql`${t.endMinute} between 1 and 1440`,
    ),
    check(
      'screen_time_windows_order_check',
      sql`${t.startMinute} < ${t.endMinute}`,
    ),
  ],
);

export const searchBlocklist = pgTable('search_blocklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
});

export const kidSearchBlocklist = pgTable('kid_search_blocklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidProfileId: uuid('kid_profile_id')
    .notNull()
    .references(() => kidProfiles.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  href: text('href'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
});

export const digestRuns = pgTable('digest_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  dayKey: text('day_key').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Parent = typeof parents.$inferSelect;
export type NewParent = typeof parents.$inferInsert;
export type KidProfile = typeof kidProfiles.$inferSelect;
export type NewKidProfile = typeof kidProfiles.$inferInsert;
export type ApprovedChannel = typeof approvedChannels.$inferSelect;
export type NewApprovedChannel = typeof approvedChannels.$inferInsert;
export type ApprovedVideo = typeof approvedVideos.$inferSelect;
export type NewApprovedVideo = typeof approvedVideos.$inferInsert;
export type PendingVideoApproval = typeof pendingVideoApprovals.$inferSelect;
export type NewPendingVideoApproval = typeof pendingVideoApprovals.$inferInsert;
export type WatchHistoryEntry = typeof watchHistory.$inferSelect;
export type NewWatchHistoryEntry = typeof watchHistory.$inferInsert;
export type SearchHistoryEntry = typeof searchHistory.$inferSelect;
export type NewSearchHistoryEntry = typeof searchHistory.$inferInsert;
export type ScreenTimeRule = typeof screenTimeRules.$inferSelect;
export type NewScreenTimeRule = typeof screenTimeRules.$inferInsert;
export type ScreenTimeSession = typeof screenTimeSessions.$inferSelect;
export type NewScreenTimeSession = typeof screenTimeSessions.$inferInsert;
export type ScreenTimeWindow = typeof screenTimeWindows.$inferSelect;
export type NewScreenTimeWindow = typeof screenTimeWindows.$inferInsert;
export type SearchBlocklistKeyword = typeof searchBlocklist.$inferSelect;
export type NewSearchBlocklistKeyword = typeof searchBlocklist.$inferInsert;
export type KidSearchBlocklistKeyword = typeof kidSearchBlocklist.$inferSelect;
export type NewKidSearchBlocklistKeyword = typeof kidSearchBlocklist.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type DigestRun = typeof digestRuns.$inferSelect;
export type NewDigestRun = typeof digestRuns.$inferInsert;

export const PENDING_APPROVAL_SOURCES = ['channel_upload', 'kid_search_request'] as const;
export type PendingApprovalSource = (typeof PENDING_APPROVAL_SOURCES)[number];

export const PENDING_APPROVAL_RESOLUTIONS = ['approved', 'rejected'] as const;
export type PendingApprovalResolution = (typeof PENDING_APPROVAL_RESOLUTIONS)[number];

export const MAX_CONTENT_RATINGS = [
  'tv_y',
  'tv_y7',
  'tv_g',
  'tv_pg',
  'tv_14',
  'tv_ma',
  'unrestricted',
] as const;
export type MaxContentRating = (typeof MAX_CONTENT_RATINGS)[number];
