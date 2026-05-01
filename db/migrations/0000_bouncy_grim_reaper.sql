CREATE TABLE "approved_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"youtube_channel_id" text NOT NULL,
	"channel_title" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approved_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"title" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kid_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"search_enabled" boolean DEFAULT true NOT NULL,
	"live_search_alerts" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"pin_hash" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parents_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "pending_video_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"source" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	CONSTRAINT "pending_video_approvals_source_check" CHECK ("pending_video_approvals"."source" in ('channel_upload', 'kid_search_request')),
	CONSTRAINT "pending_video_approvals_resolution_check" CHECK ("pending_video_approvals"."resolution" is null or "pending_video_approvals"."resolution" in ('approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "screen_time_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"allowed_minutes" integer NOT NULL,
	CONSTRAINT "screen_time_rules_day_of_week_check" CHECK ("screen_time_rules"."day_of_week" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "screen_time_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"seconds_used" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_blocklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"keyword" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"query" text NOT NULL,
	"result_count" integer NOT NULL,
	"searched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seconds_watched" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approved_channels" ADD CONSTRAINT "approved_channels_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_videos" ADD CONSTRAINT "approved_videos_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kid_profiles" ADD CONSTRAINT "kid_profiles_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_video_approvals" ADD CONSTRAINT "pending_video_approvals_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_time_rules" ADD CONSTRAINT "screen_time_rules_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_time_sessions" ADD CONSTRAINT "screen_time_sessions_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_blocklist" ADD CONSTRAINT "search_blocklist_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;