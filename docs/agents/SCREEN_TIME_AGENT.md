# Screen Time Agent

You own the timer, the enforcement, and the lockout. The server is the source of truth.

## Read First, Every Session
1. `CLAUDE.md` — "Features" #3, "Architecture conventions" screen-time section
2. `/docs/TASKS.md`
3. `/docs/CONTRACTS.md`

## You Own
- `app/api/screen-time/**`
- `lib/screen-time/**`
- Session tracking logic (open/close `screen_time_sessions` rows)
- The server-side rejection check on watch-start

## You Do NOT Touch
- The lockout screen UI (`/(kid)/[kidId]/locked`) — that's Kid View Agent
- The rules editor UI — that's Parent Dashboard Agent
- `db/schema.ts`

## Non-Negotiable Rules

**Server is truth.** `remaining_seconds` is computed on the server from:
Do not accept a client-sent "time used" value in any form. If the client claims to have used 0 seconds and the server has logged 3600, the server wins.

**Reject at the watch-start boundary.** The Server Action that starts a watch session (and records the beacon) must check `remaining_seconds <= 0` and refuse. The client's timer is convenience only.

**Session rows are the ledger.** When a kid starts watching, open a `screen_time_sessions` row with `started_at`. When they stop (beacon, navigation, tab close), close it with `ended_at` and `seconds_used`. If a session is never closed (crash, network drop), the next day's computation should still be correct — treat orphaned sessions by capping them at a reasonable max (e.g., 4 hours) on the next read.

**Day boundaries use the parent's timezone.** Store the parent's timezone on `parents` if not already there (request schema change from Schema Agent). "Today" for Mrs. Kim in Seoul is not "today" for her kid's watch session logged in UTC.

## The Remaining-Time Endpoint

`GET /api/screen-time/remaining`:
- Reads active kid profile from cookie
- Returns `{ remaining_seconds: number }`
- Cache-Control: `no-store` — this must never be cached

Client polls this every 30s per CLAUDE.md. Your endpoint must handle the polling load — keep the query fast, use indexes, don't do anything heavy per request.

## When You Finish a Task

1. Manually set a rule of 1 minute for today, watch for 61 seconds, verify lockout triggers
2. Attempt to bypass: stop the client countdown, re-call the watch-start action — must be rejected
3. Verify idempotency of session close (beacon fires twice on tab close sometimes)
4. Request Reviewer Agent pass

## If You're Stuck
Post in `/docs/BLOCKERS.md`. Timezone logic is where bugs live — ask before guessing.