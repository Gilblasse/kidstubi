CREATE TABLE "screen_time_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_profile_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	CONSTRAINT "screen_time_windows_day_of_week_check" CHECK ("screen_time_windows"."day_of_week" between 0 and 6),
	CONSTRAINT "screen_time_windows_start_check" CHECK ("screen_time_windows"."start_minute" between 0 and 1439),
	CONSTRAINT "screen_time_windows_end_check" CHECK ("screen_time_windows"."end_minute" between 1 and 1440),
	CONSTRAINT "screen_time_windows_order_check" CHECK ("screen_time_windows"."start_minute" < "screen_time_windows"."end_minute")
);
--> statement-breakpoint
ALTER TABLE "screen_time_windows" ADD CONSTRAINT "screen_time_windows_kid_profile_id_kid_profiles_id_fk" FOREIGN KEY ("kid_profile_id") REFERENCES "public"."kid_profiles"("id") ON DELETE cascade ON UPDATE no action;