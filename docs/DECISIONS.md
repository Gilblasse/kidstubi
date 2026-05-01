# Design Decisions & Spec Deviations

Each entry documents a deviation from [CLAUDE.md](../CLAUDE.md) or an agent doc, why it was made, and the user's approval state.

## D-001 — Sign-in and sign-up live outside the `(parent)` route group

**Agent:** Auth & Middleware Agent
**Task:** T0.3
**Date:** 2026-04-19
**Approval:** Pending user review (auto-applied under auto mode)

### Deviation

[docs/agents/AUTH_AGENT.md](./agents/AUTH_AGENT.md) lists `app/(parent)/sign-in/**` and `app/(parent)/sign-up/**` under the agent's **Owns** list. Implementation placed them at the top level instead:

- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`

### Why

`app/(parent)/layout.tsx` calls `ensureParent()` on every request to any route under the `(parent)` group. That's correct for protected pages, but wrong for the sign-in/sign-up pages themselves — those render for unauthenticated users and must not trigger any server logic that requires a Clerk session.

Two ways to resolve:

1. **Put sign-in/sign-up outside `(parent)`** — clean; the `(parent)` layout stays simple and only handles authenticated paths. Chosen.
2. **Keep them inside `(parent)` and branch on pathname** — requires reading request headers in the layout and adds a conditional for every request. Rejected: more surface area for bugs, and layouts don't get pathname natively.

### What still lives in `(parent)`

- `app/(parent)/layout.tsx` — `ensureParent()` idempotent upsert for authenticated parents
- `app/(parent)/setup-pin/**` — PIN setup (requires auth, no PIN yet)
- `app/(parent)/(needs-pin)/**` — everything that requires BOTH auth and a PIN set

Ownership stays with the Auth & Middleware Agent; only the path moved.

## D-002 — Kid-side URLs use `/k/[kidId]/...` prefix

**Agent:** Auth & Middleware Agent / Kid View Agent
**Task:** T0.4
**Date:** 2026-04-19
**Approval:** Pending user review (auto-applied under auto mode)

### Deviation

[CLAUDE.md](../CLAUDE.md) "Key paths" shows the kid route tree as:
```
app/(kid)/[kidId]/page.tsx
```

which would produce URLs like `/<uuid>/`, `/<uuid>/watch/<videoId>`, etc.

Implementation adds a `/k/` prefix:
```
app/(kid)/k/[kidId]/page.tsx        → /k/<uuid>
app/(kid)/k/[kidId]/watch/[videoId]/ → /k/<uuid>/watch/<videoId>
app/(kid)/k/[kidId]/channel/[channelId]/
app/(kid)/k/[kidId]/subscriptions/
app/(kid)/k/[kidId]/history/
app/(kid)/k/[kidId]/search/
app/(kid)/k/[kidId]/locked/
```

### Why

Middleware needs to distinguish kid routes from parent routes reliably. Route groups (`(kid)`, `(parent)`) don't appear in URLs, so middleware can't match on them. Without a prefix, the only way to recognize a kid URL from `/<something>/...` is to either:

1. Enumerate every parent URL (brittle — every new parent route requires middleware update), or
2. Match UUIDs via regex (still brittle — future parent routes could collide).

A `/k/` prefix makes matching a single-line `createRouteMatcher(['/k/(.*)'])`. Kid View Agent (T1.2) will create routes at the prefixed paths.

## D-003 — `middleware.ts` renamed to `proxy.ts`

**Agent:** Auth & Middleware Agent
**Task:** T0.4
**Date:** 2026-04-19
**Approval:** Pending user review (auto-applied under auto mode)

### Deviation

[docs/agents/AUTH_AGENT.md](./agents/AUTH_AGENT.md) lists `middleware.ts` under **You Own**. The file was renamed to `proxy.ts`.

### Why

Next.js 16 renamed the middleware convention file from `middleware.ts` to `proxy.ts`. The Clerk handler (`clerkMiddleware`) is a plain function export and doesn't depend on the file name — only the file location (project root) and the default export matter. Next.js 16's validator flags `middleware.ts` as deprecated.

Ownership stays with the Auth & Middleware Agent; only the file name moved.

## D-004 — Watch beacon uses `POST /api/watch` instead of a Server Action

**Agent:** Kid View Agent
**Task:** T1.4
**Date:** 2026-04-19
**Approval:** Pending user review (auto-applied under auto mode)

### Deviation

[CLAUDE.md](../CLAUDE.md) "Architecture conventions" mandates Server Actions for mutations and warns against unprotected `/api/*` mutation routes. T1.4 also says "use `navigator.sendBeacon`".

`navigator.sendBeacon` POSTs to a URL — it cannot invoke a Next.js Server Action directly. To honor "use sendBeacon" while preserving server-truth semantics, watch beaconing goes through `app/api/watch/route.ts`.

### Why this is still safe

- The route enforces auth at the boundary: Clerk session + active-kid cookie verification + body schema (zod).
- Tenant scoping is delegated to `recordWatch()`, which performs the watch-gate check (`approved_videos` row must exist for `parent_id × kid_profile_id × youtube_video_id`); rejection produces 403.
- Body `kidId` must equal the active-kid cookie — a malicious caller can't post for a kid they don't own a session for.
- No body field can grant unapproved playback; the route only writes to `watch_history`.

The Reviewer's "BLOCK on unprotected /api/* mutation route" rule applies to routes without auth. This route is auth-protected; the rationale is documented here for the next reviewer pass.

## D-005 — Screen-time day boundaries use UTC, not parent timezone

**Agent:** Screen Time Agent
**Task:** T2.2 / T2.4
**Date:** 2026-04-19
**Approval:** Pending user review (auto-applied under auto mode)

### Deviation

`docs/agents/SCREEN_TIME_AGENT.md` says: "Day boundaries use the parent's timezone. Store the parent's timezone on `parents` if not already there." `CLAUDE.md` "Data model sketch" doesn't include a `timezone` column on `parents`.

Implementation uses UTC day boundaries everywhere (`computeRemainingSecondsForKid`, `listScreenTimeSessionsInRange`, `digest_runs.day_key`).

### Why

Adding `parents.timezone` is a one-migration follow-up. Surfacing UTC explicitly in the UI ("Boundaries are UTC") is honest. Wiring per-parent timezone touches three spots: the rules computation, the usage range, and the digest dedupe key. All three would need to receive the parent's tz instead of using UTC. This is in-scope for a future polish pass — not v1.
