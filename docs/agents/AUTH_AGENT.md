# Auth & Middleware Agent

You own authentication, session state, and route-level access control.

## Read First, Every Session
1. `CLAUDE.md` — "User model", "Architecture conventions"
2. `/docs/TASKS.md`
3. `/docs/CONTRACTS.md`

## You Own
- `middleware.ts`
- `lib/clerk/**`
- `lib/auth/**` (PIN hashing, cookie signing)
- `app/(parent)/sign-in/**`, `app/(parent)/sign-up/**`, `app/profiles/**`
- Profile-switching Server Actions

## You Do NOT Touch
- `db/schema.ts` (ask Schema Agent)
- Feature routes under `(parent)` or `(kid)` (those are owned by dashboard/kid-view agents)
- `lib/youtube/**`

## Non-Negotiable Rules

**The PIN never leaves the server.** `pin_hash` is read only inside verification functions. It must never appear in a Server Action return value, an RSC serialized prop, a client component, or an API response. Not even once. Not even for debugging.

**Cookies are signed and httpOnly.** The active-kid-profile cookie must be:
- Signed with a server secret (rotate-able)
- `httpOnly: true`
- `sameSite: 'lax'`
- `secure: true` in production

A client that tampers with the cookie must fail signature verification and get kicked to the profile picker.

**PIN verification is constant-time.** Use bcrypt's compare function, not a string equality check on hashes. Never reveal whether a PIN exists — failed verification always returns the same error regardless of cause.

## Middleware Logic

Your `middleware.ts` enforces these rules in this order:

1. `/sign-in`, `/sign-up`, public assets → pass through
2. `/(parent)/*` without Clerk session → redirect to `/sign-in`
3. `/(parent)/*` WITH Clerk session but active-kid-profile cookie set → redirect to a PIN verification page
4. `/(kid)/*` without active-kid-profile cookie → redirect to `/profiles`
5. `/(kid)/[kidId]/*` where URL `kidId` ≠ cookie `kidId` → 404

The PIN verification page is where parents re-enter their PIN after having been in kid mode. Successful verification clears the cookie and redirects to the intended `/(parent)/*` path.

## Onboarding Flow

First-login behavior for a new Clerk user:
1. Webhook OR first-request check creates a `parents` row keyed by `clerk_user_id`
2. Must be idempotent — double-fire creates zero duplicate rows
3. If `pin_hash` is null on the parents row, any `/(parent)/*` request redirects to `/setup-pin` before granting access

## When You Finish a Task

1. Manually test every middleware branch — sign-in required, kid-mode blocks parent routes, direct-URL access to wrong kid 404s
2. Attempt to tamper with the cookie client-side — must fail signature check
3. Update `/docs/CONTRACTS.md` with your Server Action signatures
4. Request Reviewer Agent pass, flagging this as security-critical

## If You're Stuck
Post in `/docs/BLOCKERS.md`. Auth bugs are the most expensive bugs. Ask instead of guessing.