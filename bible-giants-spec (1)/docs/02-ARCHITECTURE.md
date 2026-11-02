# 02 — Architecture

## 1. Overview
One Next.js web app on Vercel. One Supabase project (Postgres + Auth + Realtime + Storage).
No custom server. All game logic that must be trusted lives in Postgres functions (RPCs).

```
Operator laptop  ──┐
Projector (/screen)│
Contestant laptops ├──►  Next.js on Vercel (UI only)  ──►  Supabase
Audience phones  ──┘          │                               ├─ Auth (operator + anonymous)
                              └──── supabase-js ─────────────►├─ Postgres (tables, RLS, RPCs)
                                                              ├─ Realtime (Postgres Changes)
                                                              └─ Storage (images)
```

## 2. Stack (fixed)
- Next.js (latest stable) App Router, TypeScript strict
- Tailwind CSS
- Supabase: `@supabase/supabase-js`, `@supabase/ssr`
- Fonts via `next/font`: Cormorant Garamond + Inter (self-hosted by Next, no external request at runtime)
- Testing: Vitest (unit), Playwright (e2e)
- Hosting: Vercel Hobby. Database: Supabase Free.

## 3. Allowed dependencies (nothing else without an OPEN_QUESTIONS entry)
`next react react-dom typescript tailwindcss postcss autoprefixer @supabase/supabase-js @supabase/ssr
zod papaparse clsx vitest @playwright/test eslint eslint-config-next @types/*`
- `zod`: validate all form input and CSV rows. `papaparse`: CSV parsing.
- No UI kit, no state library, no animation library (CSS transitions only), no date library.

## 4. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
That is ALL the client needs. No service-role key anywhere in this app. Provide `.env.example`.

## 5. Routes (exact)
| Route | Who | Purpose |
|---|---|---|
| `/` | all | Landing: three big buttons — Contestant, Audience, Operator |
| `/audience` | audience | Enter code + name |
| `/audience/[code]` | audience | Lobby, prediction, question, reveal, leaderboard |
| `/contestant` | contestant | Enter code + seat + PIN |
| `/contestant/[code]` | contestant | Lobby, question, answer, reveal, leaderboard |
| `/host/login` | operator | Sign in |
| `/host` | operator | Events list + create event |
| `/host/[eventId]` | operator | Event overview: join code, status controls, ready check |
| `/host/[eventId]/contestants` | operator | Manage contestants |
| `/host/[eventId]/rounds` | operator | Manage rounds + questions + CSV import |
| `/host/[eventId]/live` | operator | Live console |
| `/host/[eventId]/results` | operator | Final standings, adjustments log, raffle |
| `/screen/[eventId]` | projector | Public display (requires operator sign-in) |

Route protection: `middleware.ts` redirects `/host/*` and `/screen/*` to `/host/login` when there is no
non-anonymous session. Contestant/audience pages redirect to their entry page when not joined.

## 6. Folder structure (exact)
```
app/                      routes above
components/
  ui/                     Button, Card, Input, Badge, Modal, Spinner, Toast, Countdown
  host/                   console pieces
  contestant/             contestant views
  audience/               audience views
  screen/                 projector views
lib/
  supabase/client.ts      browser client
  supabase/server.ts      server client (cookies)
  rpc.ts                  typed wrappers for EVERY RPC (only place that calls supabase.rpc)
  realtime/useGameState.ts  game_state subscription + reconnect + polling fallback
  realtime/useServerClock.ts  server time offset
  scoring.ts              pure display helper: potential points at time t (mirrors SQL)
  csv.ts                  CSV parse + validate (zod)
  types.ts                DB types
supabase/
  schema.sql              the one schema file (run once on a fresh project)
tests/
  unit/                   Vitest
  e2e/                    Playwright
docs/                     these documents + PROGRESS.md + AUDIT.md + OPEN_QUESTIONS.md
public/brand/             logo files supplied by owner
```
Rule: components never call `supabase.from(...).insert/update` for game actions. They call `lib/rpc.ts`.

## 7. Authentication model
- Operator: Supabase email+password user, created by the owner in the Supabase dashboard (documented in README). `owner_id` on events.
- Contestant / audience: `supabase.auth.signInAnonymously()` on first visit, then `join_as_contestant` /
  `join_as_audience` RPC links `auth.uid()` to the contestant/audience row. Session persists in the browser;
  refresh keeps identity. **Anonymous sign-ins must be enabled** in Supabase Auth settings.
- A contestant can re-claim their seat from another laptop using the PIN (the old session loses the seat).

## 8. Realtime strategy
- Everyone subscribes to `game_state` for their event (row filter `event_id=eq.<id>`).
- Host additionally subscribes to `answers`, `audience_members`, `contestants`, `predictions`, `contestant_scores`, `audience_scores`.
- Contestants/audience additionally subscribe to `contestant_scores` (and `audience_scores`) for leaderboards, and `raffle_draws`.
- `useGameState(eventId)` MUST: (1) fetch on mount, (2) subscribe, (3) track channel status,
  (4) on `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` show "Reconnecting…", retry with backoff, and poll
  `game_state` every 3 s until subscribed again, (5) on every (re)subscribe do a full re-fetch,
  (6) ignore state with `version` lower than what is already held.
- Presence ("connected" dots): contestants join a Supabase Realtime Presence channel `presence:<eventId>` with their contestant id; the host console reads it. Presence is for display only and never affects game logic.
- Visibility: when the tab becomes visible again (`visibilitychange`), re-fetch immediately.

## 9. Time handling
- Countdown display: client computes `remaining = closes_at − (Date.now() + serverOffset)`.
  `serverOffset` comes from `server_time()` RPC (call 3 times on load, keep the lowest-latency sample, refresh every 60 s).
- The countdown is DISPLAY ONLY. The server decides acceptance (`submit_answer`) and scoring.
- All displayed clock times use `Africa/Lagos`.

## 10. Error handling conventions
- `lib/rpc.ts` returns `{ ok: true, data } | { ok: false, code, message }`. Never throws into the UI.
- Known codes from RPCs are mapped to plain English in one table (`lib/errors.ts`): `closed`, `late`,
  `already_answered`, `not_joined`, `not_your_question`, `bad_pin`, `locked_out`, `audience_full`, `no_event`, `not_owner`.
- Unknown errors: "Something went wrong. Please try again." and log to console with context.

## 11. Storage (images)
- Bucket `media` (public read). Operator-only write (policy in schema.sql). Max 1 MB, JPEG/PNG/WebP only, validated client-side and by bucket limits.
- Question images and contestant photos use this bucket. Compress/resize is out of scope; reject oversize files with a clear message.

## 12. Deployment steps (document in README.md)
1. Create Supabase project. Auth → enable "Anonymous sign-ins". Create operator user (email + password).
2. SQL editor → run `supabase/schema.sql` once.
3. Copy URL + anon key to Vercel env vars and `.env.local`.
4. Push to GitHub, import in Vercel, deploy.
5. Sign in at `/host/login`, create the event, rehearse (see `08-TEST-PLAN.md`).
6. Three days before the event: open the Supabase dashboard to make sure the project is active (free projects pause after inactivity).

## 13. Capacity notes
Supabase Free has a cap on concurrent realtime connections (verify the current number on the Supabase pricing page).
Each phone and laptop uses one connection. Default audience cap is 120 so 8 contestants + operator + projector + 120 audience stays under typical free limits.
If the cap is hit the app must show "Event is full" on join — never crash.
