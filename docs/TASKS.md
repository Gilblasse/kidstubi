# KidTube Sprint Plan

Living document. Orchestrator updates status. Agents claim tasks by putting their name in `Owner` and flipping status to `In Progress`. Do not start a task whose dependencies are not `Done`.

Status values: `Blocked` | `Ready` | `In Progress` | `In Review` | `Done`

---

## Sprint 0 — Foundation (Critical Path, Serialized)

These must ship in order. Nothing else starts until Sprint 0 is `Done`.

### T0.1 — Project scaffold
- **Owner:** Orchestrator (one-time setup)
- **Status:** Ready
- **Depends on:** —
- **Deliverables:**
  - `pnpm` Next.js App Router project, TypeScript strict
  - Tailwind + shadcn/ui initialized via CLI
  - `vercel.ts` with `@vercel/config` (no `vercel.json`)
  - Route group folders created empty: `app/(parent)/`, `app/(kid)/`, `app/api/`
  - `.env.example` with `YOUTUBE_API_KEY`, `DATABASE_URL`, `CLERK_*`, `RESEND_API_KEY`
- **Acceptance:** `pnpm dev` runs, `pnpm typecheck` passes, folder structure matches CLAUDE.md "Key paths"

### T0.2 — Database schema + query layer
- **Owner:** Schema Agent
- **Status:** Blocked on T0.1
- **Deliverables:**
  - `db/schema.ts` implementing every table in CLAUDE.md "Data model sketch" exactly
  - Drizzle config + initial migration
  - `db/queries/` with typed helpers, one file per domain: `parents.ts`, `kidProfiles.ts`, `channels.ts`, `videos.ts`, `approvals.ts`, `history.ts`, `search.ts`, `screenTime.ts`, `blocklist.ts`
  - Every query function takes `parentId` as a required argument and scopes internally — no exceptions
  - Seed script for local dev: one parent, two kid profiles, a few approved channels/videos
- **Acceptance:**
  - Reviewer Agent confirms every query filters by `parent_id` (directly or via `kid_profile_id → parent_id` join)
  - `pnpm db:migrate` and `pnpm db:seed` run clean
  - Type exports are consumable by other agents without re-declaring shapes

### T0.3 — Clerk auth + parent onboarding
- **Owner:** Auth & Middleware Agent
- **Status:** Blocked on T0.2
- **Deliverables:**
  - Clerk installed via Vercel Marketplace integration
  - Sign-up flow creates a `parents` row keyed by `clerk_user_id` on first login
  - `app/(parent)/layout.tsx` requires authenticated Clerk user, redirects to sign-in otherwise
  - PIN setup screen on first parent load if `pin_hash` is null — bcrypt, server-side only
- **Acceptance:**
  - New Clerk user triggers exactly one `parents` row (idempotent)
  - PIN is never returned to the client in any response
  - Reviewer Agent confirms no `pin_hash` appears in client bundles or serialized props

### T0.4 — Profile switching + middleware gate
- **Owner:** Auth & Middleware Agent
- **Status:** Blocked on T0.3
- **Deliverables:**
  - `middleware.ts` that:
    - Blocks `/(parent)/*` without Clerk session → redirect to sign-in
    - Blocks `/(kid)/*` without active-kid-profile signed cookie → redirect to profile picker
    - Blocks `/(parent)/*` when an active kid profile is set → require PIN verification first
  - Profile picker page at `/profiles` listing the parent's `kid_profiles`
  - Server Action `setActiveKidProfile(kidProfileId)` sets signed cookie
  - Server Action `exitKidMode(pin)` verifies PIN, clears cookie, redirects to `/dashboard`
- **Acceptance:**
  - Direct URL access to `/(kid)/[kidId]/...` without an active profile cookie 404s or redirects
  - PIN verification failure does not reveal whether PIN exists
  - Cookie is signed and httpOnly; cannot be forged from the client

---

## Sprint 1 — Parent Can Curate, Kid Can Watch (MVP Vertical Slice)

Goal: A parent can add a channel, approve some videos, and a kid profile can watch them. Everything else (screen time, search, notifications) comes after.

Schema Agent is done for this sprint after T0.2. Parent Dashboard and Kid View agents run in parallel against shared query types.

### T1.1 — Channel add + video review screen (parent side)
- **Owner:** Parent Dashboard Agent
- **Status:** Blocked on Sprint 0
- **Depends on:** T1.3 (YouTube channel/video metadata fetch)
- **Deliverables:**
  - `app/(parent)/kids/[kidId]/channels/page.tsx` lists approved channels, "Add Channel" button
  - Add Channel flow: paste YouTube URL or channel ID → server fetches channel metadata → review screen at `/kids/[kidId]/channels/[channelId]/review`
  - Review screen: paginated grid (50/page) of every video in the channel, each with checkbox, thumbnail, title, duration, upload date
  - "Select All" toggle applies to current page only (per CLAUDE.md)
  - Submit inserts `approved_channels` row and bulk-inserts `approved_videos` for checked items
- **Acceptance:**
  - Unchecked videos are not written to `approved_videos`
  - Re-adding a channel shows existing approvals as pre-checked (idempotent)

### T1.2 — Kid home feed, channel page, watch page
- **Owner:** Kid View Agent
- **Status:** Blocked on Sprint 0
- **Deliverables:**
  - `app/(kid)/[kidId]/page.tsx` — home feed grid of approved videos for this kid, sorted by approved_at desc
  - `app/(kid)/[kidId]/channel/[channelId]/page.tsx` — banner, avatar, approved-videos grid for that channel
  - `app/(kid)/[kidId]/watch/[videoId]/page.tsx` — YouTube IFrame player at 16:9, title, channel, approved_at
  - Top nav + collapsible left rail matching CLAUDE.md "Visual design & UX"
  - Dark theme default, light toggle
  - Empty state on home feed when no channels added: "Ask a grown-up to add some channels!"
- **Acceptance:**
  - Navigating to `/watch/[videoId]` for a video NOT in `approved_videos` for this kid → 404
  - No related videos, no comments, no end-screen suggestions
  - Reviewer Agent confirms no discovery/recommendation UI anywhere in `(kid)` routes

### T1.3 — YouTube metadata fetchers
- **Owner:** YouTube Integration Agent
- **Status:** Blocked on T0.1
- **Deliverables:**
  - `lib/youtube/client.ts` — typed wrapper around YouTube Data API v3, server-only
  - `lib/youtube/channels.ts` — `getChannelByIdOrUrl`, `listChannelVideos(channelId, pageToken)`
  - `lib/youtube/videos.ts` — `getVideoMetadata(videoId)`
  - `.env` validation at startup — fail loud if `YOUTUBE_API_KEY` missing
- **Acceptance:**
  - No YouTube API calls from client components anywhere
  - Reviewer Agent confirms `process.env.YOUTUBE_API_KEY` is only referenced in server-only files
  - Quota-aware: responses cache briefly to avoid hammering channel-list endpoints during pagination

### T1.4 — Watch history write
- **Owner:** Kid View Agent
- **Status:** Blocked on T1.2
- **Deliverables:**
  - Server Action `recordWatch(kidProfileId, videoId, secondsWatched)` inserts into `watch_history`
  - Client beacon on watch page fires on play, on pause, on tab close (use `navigator.sendBeacon`)
- **Acceptance:**
  - A kid watching a video produces at least one `watch_history` row
  - Server Action rejects if `videoId` is not in `approved_videos` for `kidProfileId`

### T1.5 — Parent watch history view
- **Owner:** Parent Dashboard Agent
- **Status:** Blocked on T1.4
- **Deliverables:**
  - `app/(parent)/kids/[kidId]/history/page.tsx` — chronological list grouped by day
  - Each row: thumbnail, title, channel, watched time, "Replay" button
  - Replay navigates parent to an embedded playback preview (not the kid view)
- **Acceptance:**
  - Shows history only for kids belonging to the authenticated parent
  - Reviewer Agent confirms tenant scoping on the history query

---

## Sprint 2 — Screen Time Enforcement

### T2.1 — Screen-time rules editor
- **Owner:** Parent Dashboard Agent
- **Status:** Blocked on Sprint 1
- **Deliverables:** Form at `/kids/[kidId]/screen-time` to set allowed minutes per day-of-week (0–6)

### T2.2 — Server-truth remaining-time endpoint
- **Owner:** Screen Time Agent
- **Status:** Blocked on T2.1
- **Deliverables:**
  - `app/api/screen-time/remaining/route.ts` returns `{ remaining_seconds: number }` for active kid profile
  - Computation: today's rule `allowed_minutes * 60` minus sum of today's `screen_time_sessions.seconds_used`
- **Acceptance:** Reviewer Agent confirms client-sent time values are ignored in the computation

### T2.3 — Session tracking + lockout
- **Owner:** Screen Time Agent + Kid View Agent (coordinate)
- **Status:** Blocked on T2.2
- **Deliverables:**
  - Session row opens on watch-page mount, closes on unmount/beacon
  - Client polls `/api/screen-time/remaining` every 30s
  - On `<=0`, navigate to `/(kid)/[kidId]/locked`
  - Watch-start Server Action also rejects when `remaining_seconds <= 0`
- **Acceptance:**
  - Disabling the client timer in devtools does NOT grant extra time (server rejects)
  - Lockout screen does not offer a way back into video playback

### T2.4 — Usage stats view
- **Owner:** Parent Dashboard Agent
- **Status:** Blocked on T2.3
- **Deliverables:** Avg per day, per week, total across date range, charted

---

## Sprint 3 — Approvals & Notifications

### T3.1 — Pending approvals inbox
- **Owner:** Parent Dashboard Agent
- **Status:** Blocked on Sprint 1
- **Deliverables:** `/kids/[kidId]/approvals` lists `pending_video_approvals`, approve/reject actions, filterable by source

### T3.2 — Channel-upload cron
- **Owner:** YouTube Integration Agent
- **Status:** Blocked on Sprint 1
- **Deliverables:**
  - Vercel Cron daily, iterates `approved_channels`, inserts new uploads into `pending_video_approvals` with source `channel_upload`
  - Configured in `vercel.ts`

### T3.3 — Notifications
- **Owner:** Notifications Agent
- **Status:** Blocked on T3.1
- **Deliverables:**
  - `lib/notifications/` with in-app + Resend email
  - In-app bell component in parent nav
  - Daily digest cron batching pending approvals

---

## Sprint 4 — Kid Search

### T4.1 — Search endpoint + blocklist
- **Owner:** YouTube Integration Agent
- **Status:** Blocked on Sprint 3
- **Deliverables:** Full `/api/search` pipeline per CLAUDE.md (search_enabled check → safeSearch=strict → blocklist filter → history insert → optional alert)

### T4.2 — Kid search UI
- **Owner:** Kid View Agent
- **Status:** Blocked on T4.1
- **Deliverables:** Search box in top nav, results as non-playable cards, click triggers approval-request Server Action, "Waiting" shelf on home

### T4.3 — Search history + blocklist admin
- **Owner:** Parent Dashboard Agent
- **Status:** Blocked on T4.1
- **Deliverables:** `/kids/[kidId]/search-history`, blocklist editor in settings, live-alerts toggle

---

## Parking Lot (Not This Release)

Anything listed in CLAUDE.md "Out of scope (v1)". Do not propose tasks for these without user approval.