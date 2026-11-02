# 07 — Build Plan (strict order, with gates)

Rule: finish a phase completely, prove it (see commands and tests), update `docs/PROGRESS.md`,
then STOP and wait for the owner to say "Proceed to Phase N+1".
Every phase must end with: `npm run typecheck && npm run lint && npm run test && npm run build` passing.

## Phase 0 — Audit and foundation
Do: audit existing code → `docs/AUDIT.md`; set up folder structure per doc 02; Tailwind tokens and fonts per doc 06;
`.env.example`; scripts (`typecheck`, `lint`, `test`, `test:e2e`, `build`); Supabase clients; `middleware.ts`.
Gate: app builds; landing page `/` renders in the design system; AUDIT.md complete.

## Phase 1 — Database
Do: run/adjust `supabase/schema.sql`; generate `lib/types.ts`; write `lib/rpc.ts` wrappers for ALL RPCs; `lib/errors.ts`.
Test: all `SEC-*` tests that are SQL-level run via a test script (`tests/e2e/security.spec.ts` using two supabase clients).
Gate: SEC-01…SEC-12 pass; scoring unit tests pass.

## Phase 2 — Operator: login, events, contestants
Do: S-06, S-07, S-08 (overview, status stepper, join code, audience list), S-09 (contestants incl. photo upload).
Gate: AC-01, AC-02 (contestant can sign in after Phase 4), contestant CRUD works, PIN shown once.

## Phase 3 — Operator: rounds, questions, CSV import
Do: S-10 fully, template CSV, Ready check logic (FR-023/024).
Gate: AC-03; CSV import test with a file that has 2 deliberate errors reports exactly those rows.

## Phase 4 — Contestant and audience join + lobby
Do: S-01, S-02, S-03 (lobby + predictions parts), S-04, S-05 (waiting part); `useGameState`, `useServerClock`, connection dot.
Gate: AC-02, AC-04, AC-05; refresh restores identity; reconnect test (toggle network offline/online) passes.

## Phase 5 — The live engine (core)
Do: S-11 live console; all `host_*` question RPC UI; S-05 and S-03 question/open/locked/revealed views; S-13 projector question + answer modes; auto-lock timer; reset question.
Gate: AC-06, AC-07, AC-08, AC-09, AC-13, AC-14 with the 3-browser e2e flow (host + 2 contestants + 1 audience).

## Phase 6 — Individual round, spoken mode, leaderboard
Do: individual/assigned questions, spoken marking buttons, leaderboards (contestant + audience) on all screens, tie-break display, score adjustments.
Gate: AC-10, AC-11.

## Phase 7 — Winner, raffle, results, projector complete
Do: S-12, remaining projector modes (lobby, predictions, leaderboard, winner, raffle, blank), results CSV export, keyboard shortcuts.
Gate: AC-12, AC-15.

## Phase 8 — Hardening and release
Do: S-14 error/404 pages; offline banner; empty/loading/error states audit across ALL screens; accessibility pass; README (setup + deploy + runbook); deploy to Vercel; full e2e suite; load test with 8 contestant sessions + 120 audience sessions (script).
Gate: AC-16, AC-17 (rehearsal with owner), AC-18. Owner signs off the checklist in doc 08.

## Per-phase report template (write in docs/PROGRESS.md)
```
## Phase N — <name> — <date>
Built: …
Files changed: …
Commands run and results: …
Tests run and results: …
Known gaps / risks: …
Assumptions made (Q-numbers): …
```
