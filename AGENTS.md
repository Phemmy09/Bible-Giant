# CLAUDE.md — Bible Giants (READ THIS FIRST, EVERY SESSION)

You are building **Bible Giants**, a live Bible quiz competition web app for the Apostolic Faith
camp meeting (Ado Ekiti / Ondo and Ekiti region). It will be used LIVE in front of an audience.
A failure on the day is not acceptable. Correctness and reliability beat cleverness and speed.

## 0. Source of truth (in priority order)
1. `CLAUDE.md` (this file)
2. `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md` — CURRENT PHASE: overrides docs 01–08 wherever they conflict (see its §2)
3. `docs/01-PRD.md` — what to build (scope is LOCKED)
4. `docs/04-GAME-RULES-AND-SCORING.md` — state machines and scoring (exact)
5. `docs/03-DATA-AND-SECURITY.md` + `supabase/schema.sql` — data, RLS, RPCs (exact)
6. `docs/05-SCREENS.md` — every screen and element
7. `docs/02-ARCHITECTURE.md` — stack, routes, structure
8. `docs/06-DESIGN-SYSTEM.md` — look and feel
9. `docs/07-BUILD-PLAN.md` — the order of work and the gates
10. `docs/08-TEST-PLAN.md` — how "done" is proven

If two documents disagree, the higher one wins. If something is not specified, DO NOT GUESS:
write the question in `docs/OPEN_QUESTIONS.md`, choose the SIMPLEST safe option, mark it
`// ASSUMPTION(Q-n)` in code, and continue.

## 1. Scope lock (hard rules)
- Build ONLY what the PRD lists. Do not add features, screens, pages, settings, animations,
  analytics, chat, themes, languages, payments, social login, or "nice extras".
- Every screen in `docs/05-SCREENS.md` MUST exist and work. No placeholders, no "coming soon",
  no TODO screens, no mock data in the final build.
- Do not rename routes, tables, RPCs, statuses, or enum values. Use them exactly as written.
- Do not change the stack. No new dependency unless listed in `docs/02-ARCHITECTURE.md` §3.
  If you truly need one, add it to `docs/OPEN_QUESTIONS.md` first and justify it.
- Do not "refactor for cleanliness" working code outside the current phase.

## 2. Existing code
A partial app already exists in this repo. Before writing anything new (Phase 0):
- Audit it and write `docs/AUDIT.md`: for each existing file say KEEP / ADAPT / REPLACE and why.
- Keep what already conforms to the docs. Replace what does not. Never silently delete working
  work that the PRD needs; never leave dead code behind.

## 3. Security rules that must never be broken
- The correct answer and the explanation live ONLY in `question_keys`. NEVER select them, send
  them, log them, or put them in client state before the question status is `revealed`.
- Clients NEVER write directly to `answers`, `game_state`, `contestant_scores`,
  `audience_scores`, `predictions`, `raffle_draws`. They call RPCs only.
- Scoring happens in the database (`host_reveal_question`). Clients never compute final scores.
- Time for scoring is SERVER time only. Never use `Date.now()` or any client clock for scoring.
- Never put the Supabase service-role key in client code or in any `NEXT_PUBLIC_*` variable.
- Host-only pages and RPCs require a signed-in non-anonymous operator.

## 4. Reliability rules (the app MUST keep working on a bad network)
- Every realtime subscription has: status handling, automatic reconnect, and on reconnect a full
  re-fetch of `game_state` and the current question. Plus a 3-second polling fallback while
  disconnected. A refresh at ANY moment must restore the correct screen.
- Every button that calls the server: disables while pending, shows success or a plain-language
  error, and is safe against double-clicks (server is idempotent where specified).
- A contestant's answer button shows a clear "Answer received" state only after the server
  confirms. If the call fails, show "Not sent — tap again" while the question is still open.
- Never leave the user on a blank screen. Every screen has loading, empty and error states.
- The host console must always show: connection status, event status, current round/question,
  question status, and the count of connected contestants.

## 5. Working method (every phase)
1. Read the phase in `docs/07-BUILD-PLAN.md`. State the files you will touch.
2. Build only that phase.
3. Run: `npm run typecheck && npm run lint && npm run test && npm run build`. All must pass.
4. Run the phase's e2e/security tests from `docs/08-TEST-PLAN.md`. All must pass.
5. Update `docs/PROGRESS.md`: phase, what was done, test evidence (command + result), known gaps.
6. STOP at the phase gate and wait for the owner's approval before starting the next phase.
Never write "done", "fixed" or "working" unless you ran it and saw it pass. Say exactly what
you ran. If you could not run something, say so plainly.

## 6. Definition of done (whole project)
Every acceptance criterion `AC-*` in `docs/01-PRD.md` passes, the full Playwright flow passes,
all security tests `SEC-*` pass, and the rehearsal checklist in `docs/08-TEST-PLAN.md` is signed
off by the owner.

## 7. Style
- TypeScript strict. No `any` without a comment explaining why.
- Server Components by default; client components only where interactivity or realtime is needed.
- Small files, clear names. Keep business rules in `lib/` and the database, not in JSX.
- Plain English UI copy. No jargon in what contestants, audience, or the operator read.
