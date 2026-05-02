CREATE TABLE "kid_search_blocklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approved_videos" ADD COLUMN "content_rating" text;--> statement-breakpoint
ALTER TABLE "approved_videos" ADD COLUMN "made_for_kids" boolean;--> statement-breakpoint
ALTER TABLE "kid_profiles" ADD COLUMN "max_content_rating" text DEFAULT 'tv_g' NOT NULL;--> statement-breakpoint
ALTER TABLE "kid_search_blocklist" ADD CONSTRAINT "kid_search_blocklist_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kid_profiles" ADD CONSTRAINT "kid_profiles_max_content_rating_check" CHECK ("kid_profiles"."max_content_rating" in ('tv_y', 'tv_y7', 'tv_g', 'tv_pg', 'tv_14', 'tv_ma', 'unrestricted'));