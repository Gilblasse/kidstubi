# KidTube

A safe YouTube for kids. Parents curate which channels and videos their children can watch; kids see only parent-approved content. No inappropriate recommendations, no rabbit-hole autoplay, no comments, no way to escape to youtube.com.

## User model

- **One parent account** (email + password, via Clerk) owns the tenant.
- **Multiple kid sub-profiles** live under each parent. Kids do not have their own credentials — they pick a profile avatar to enter kid view.
- **PIN gate** protects the return path from kid view to parent view. The PIN is per-parent, not per-kid.
- **Two distinct views:** `(kid)` route group looks like YouTube; `(parent)` route group is a clean admin dashboard. Middleware enforces which routes each session can access based on the active profile.

## Visual design & UX

The kid view is a YouTube clone in layout and interaction so the experience feels familiar:

- **Top nav:** logo (left), centered search bar, profile avatar (right). Hamburger collapses the left rail.
- **Left rail:** Home, Subscriptions, History. Collapsible to icon-only like YouTube.
- **Home feed:** responsive grid of video cards. Each card has a 16:9 thumbnail with duration overlay bottom-right, title clamped to 2 lines, channel name, upload age ("3 days ago").
- **Channel pages:** banner image, channel avatar + name, Videos tab showing the approved video grid.
- **Watch page:** player above the fold at 16:9, title + channel + approved-on date below, no comments, no related-videos sidebar, no end-screen overlays.
- **Dark theme by default**, light theme available via toggle. Use Tailwind + shadcn/ui; reference YouTube's spacing and typography.
- **Parent dashboard** deliberately does NOT look like YouTube — sidebar layout with cards, tables, and form controls, so parents never confuse it with the kid view.

## Features

1. **Monitored by parents.** Parents can open each kid profile and see the full watch history plus a replay-any-video action. History is chronological, grouped by day.
2. **Channel addition.** A kid's home feed is empty until the parent adds channels. Adding a channel opens a paginated review screen listing every video in that channel (50 per page); the parent checks/unchecks items, and a Select All toggle applies to the current page. Unchecked videos are excluded from the kid's feed.
3. **Screen time.** Parent sets a per-day-of-week schedule of how many minutes the site is unlocked. A usage-stats view shows average time per day, per week, and total across date ranges. Enforcement is a hard cutoff: when the budget is hit, the kid view swaps to a lockout screen.
4. **Parent-side content discovery.** Recommendations only exist in the parent dashboard — a "Discover" area where the parent can browse and approve new content. No discovery UI is rendered on the kid side.
5. **New content approval.** When a subscribed YouTuber posts a new video, the system queues it into `pending_video_approvals` and notifies the parent (in-app bell + daily email digest). The video is NOT visible to the kid until the parent approves it.
6. **Kid search.** Kids can search if `search_enabled` is true on their profile. The server calls YouTube Data API with `safeSearch=strict`, post-filters against a parent-editable keyword blocklist, and logs every query to `search_history`. If `live_search_alerts` is on, an in-app + email notification fires the moment the query is submitted. Results are browsable but NOT playable — clicking a result creates a `pending_video_approvals` row with source `kid_search_request`, and the kid sees "waiting for parent" until approved.
7. **Kid view.** Only approved channels and approved videos are playable. Approved videos from search requests surface back in the kid's feed under a "Waiting" shelf until approved, then move into the main feed.
8. **Parent dashboard.** Single surface for: watch history per kid, usage stats, pending approvals, search history, channel management, screen-time rules, PIN + settings.

## Tech stack

- **Framework:** Next.js App Router (React Server Components by default, Server Actions for mutations)
- **Hosting:** Vercel with Fluid Compute, Node.js 24
- **Config:** `vercel.ts` (not `vercel.json`)
- **Auth:** Clerk (via Vercel Marketplace) — parent credentials + Clerk user ID as tenant key
- **Database:** Neon Postgres (via Vercel Marketplace) accessed through Drizzle ORM
- **YouTube integration:** YouTube Data API v3 for search/channel/video metadata (server-side only), YouTube IFrame Player API for playback
- **Email:** Resend for notification digests
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript strict mode

## Data model sketch

```
parents (
  id uuid pk,
  clerk_user_id text unique,
  pin_hash text,
  email text,
  created_at timestamptz
)

kid_profiles (
  id uuid pk,
  parent_id uuid fk -> parents,
  display_name text,
  avatar_url text,
  search_enabled bool default true,
  live_search_alerts bool default false,
  created_at timestamptz
)

approved_channels (
  id uuid pk,
  kid_profile_id uuid fk,
  youtube_channel_id text,
  channel_title text,
  added_at timestamptz
)

approved_videos (
  id uuid pk,
  kid_profile_id uuid fk,
  youtube_video_id text,
  channel_id text,
  title text,
  thumbnail_url text,
  duration_seconds int,
  approved_at timestamptz
)

pending_video_approvals (
  id uuid pk,
  kid_profile_id uuid fk,
  youtube_video_id text,
  source text check (source in ('channel_upload', 'kid_search_request')),
  requested_at timestamptz,
  resolved_at timestamptz,
  resolution text check (resolution in ('approved', 'rejected', null))
)

watch_history (
  id uuid pk,
  kid_profile_id uuid fk,
  youtube_video_id text,
  watched_at timestamptz,
  seconds_watched int
)

search_history (
  id uuid pk,
  kid_profile_id uuid fk,
  query text,
  result_count int,
  searched_at timestamptz
)

screen_time_rules (
  id uuid pk,
  kid_profile_id uuid fk,
  day_of_week int check (day_of_week between 0 and 6),
  allowed_minutes int
)

screen_time_sessions (
  id uuid pk,
  kid_profile_id uuid fk,
  started_at timestamptz,
  ended_at timestamptz,
  seconds_used int
)

search_blocklist (
  id uuid pk,
  parent_id uuid fk,
  keyword text
)
```

All child tables scope through `kid_profile_id` which scopes through `parent_id`. Every query MUST filter by the active parent's tenant to prevent cross-tenant leakage.

## Architecture conventions

- **Route groups:** `app/(parent)/...` and `app/(kid)/...`. Middleware reads the active session profile and 404s on mismatched access.
- **Server Components by default.** Client Components only where interactivity requires it (player controls, search box, screen-time countdown).
- **Server Actions for mutations.** No unprotected `/api/*` mutation routes.
- **YouTube API key is server-only.** Never expose it to the client. All YouTube API calls go through `app/api/youtube/*` or Server Actions.
- **Screen-time enforcement:**
  - Server owns truth. `GET /api/screen-time/remaining` returns `remaining_seconds` for the active kid profile.
  - Client displays a countdown and polls every 30s. When 0, client navigates to `/locked`.
  - Server ALSO rejects any video-start request when `remaining_seconds <= 0` — never trust the client timer.
- **Kid search flow (`/api/search`):**
  1. Check `kid_profiles.search_enabled`. If false → 403.
  2. Call YouTube Data API with `q=<query>`, `safeSearch=strict`, `type=video`.
  3. Filter results against `search_blocklist` for the parent.
  4. Insert a `search_history` row.
  5. If `kid_profiles.live_search_alerts` is true, enqueue an in-app notification and email.
  6. Return filtered results. The client renders them as non-playable cards; clicking one calls a Server Action that creates a `pending_video_approvals` row with source `kid_search_request`.
- **New-video detection:** a Vercel Cron (daily) iterates `approved_channels` and checks for uploads newer than the channel's last-seen video. New uploads are inserted into `pending_video_approvals` with source `channel_upload`.

## Conventions for Claude Code

- **Prefer editing existing files** over creating new ones.
- **No speculative abstractions.** Don't add helpers for hypothetical second callers. Three similar lines is fine.
- **No error handling for scenarios that can't happen.** Validate at system boundaries (API routes, Server Actions). Trust internal code.
- **No comments** unless the WHY is non-obvious. Identifiers should carry the meaning.
- **TypeScript strict.** No `any` without a WHY comment.
- **No `vercel.json`.** Use `vercel.ts` with `@vercel/config`.
- **Package manager:** pnpm.
- **UI:** Tailwind + shadcn/ui. Install components with the shadcn CLI; don't hand-copy.
- **Keep PR scope tight.** A bug fix doesn't need surrounding cleanup.

## Out of scope (v1)

- Social features (likes, comments, sharing)
- Live streams
- User-uploaded videos
- Native mobile apps (web-responsive only)
- Multi-parent households / co-parenting
- Offline playback

## Key paths (once scaffolded)

```
app/
  (parent)/
    dashboard/
    kids/[kidId]/
      history/
      approvals/
      channels/
      search-history/
      screen-time/
    settings/
  (kid)/
    [kidId]/
      page.tsx            # home feed
      watch/[videoId]/
      channel/[channelId]/
      subscriptions/
      history/
      search/
      locked/             # screen-time lockout
  api/
    youtube/
    search/
    screen-time/
db/
  schema.ts               # Drizzle schema
  queries/
lib/
  clerk/
  notifications/
  youtube/
vercel.ts
```
