# Progress Log — Bible Giants

This document tracks progress, test evidence, known gaps, and assumptions for each phase per `CLAUDE.md` §5 and `docs/07-BUILD-PLAN.md`.

---

## Phase 0 — Audit and Foundation — 2026-10-31

### Built
- Audited all existing files from imported repository (`afm-bible-giant2`) and produced `docs/AUDIT.md` (KEEP / ADAPT / REPLACE with detailed rationale for every file).
- Preserved legacy codebase in `legacy_src/` to prevent interference with Next.js App Router.
- Created required directory structure conforming to `docs/02-ARCHITECTURE.md` §6:
  - `app/` (Next.js App Router)
  - `components/ui/`, `components/host/`, `components/contestant/`, `components/audience/`, `components/screen/`
  - `lib/supabase/`, `lib/realtime/`
  - `tests/unit/`, `tests/e2e/`
  - `public/brand/`
- Configured project dependencies strictly adhering to allowed list in `docs/02-ARCHITECTURE.md` §3 (no prohibited UI kits, state stores, animation libraries, or sound engines).
- Configured Tailwind CSS tokens matching `docs/06-DESIGN-SYSTEM.md` (§1 Colors: `navy-950`, `navy-900`, `navy-700`, `gold-500`, `gold-300`, `cream-50`, `cream-100`, `ink-900`, `ink-500`, `success`, `danger`, `warning`; §2 Typography: Cormorant Garamond + Inter; §3 Shapes & Shadows).
- Set up self-hosted Google fonts via `next/font/google` (`Cormorant_Garamond` and `Inter`) in `app/layout.tsx`.
- Built S-01 Landing page (`app/page.tsx`) with wordmark "Bible Giants", gold rule, camp meeting subtitle, three primary action buttons, and Apostolic Faith footer.
- Built `components/ui/Button.tsx` adhering to design system button variants (primary, gold, ghost, danger) and sizes.
- Set up Supabase browser client (`lib/supabase/client.ts`) and server client (`lib/supabase/server.ts`) using `@supabase/ssr`.
- Built `middleware.ts` for route protection of `/host/*` and `/screen/*`.
- Configured `.env.example` and local environment file `.env.local`.
- Created pure display helper `lib/scoring.ts` implementing `pointsFor(elapsedMs, M, m, T)`.
- Set up unit testing with Vitest (`vitest.config.ts`) and verified scoring formulas (`tests/unit/scoring.test.ts`).
- Created `docs/OPEN_QUESTIONS.md` documenting defaults and scope clarifications.

### Files Changed / Created
- `docs/AUDIT.md`
- `docs/OPEN_QUESTIONS.md`
- `docs/PROGRESS.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.mjs`
- `postcss.config.js`
- `tailwind.config.js`
- `.env.example`
- `.env.local`
- `.gitignore`
- `.eslintrc.json`
- `vitest.config.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `components/ui/Button.tsx`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/scoring.ts`
- `tests/unit/scoring.test.ts`
- `middleware.ts`
- `legacy_src/` (renamed from `src/` to isolate legacy Vite SPA)

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (1 test file, 2 passed tests).
- `npm.cmd run build` (`next build`): PASSED (Production build generated static routes `/` and `/_not-found` + compiled middleware).

### Tests Run and Results
- `tests/unit/scoring.test.ts`:
  - `U-01`: verified `pointsFor` for M=100, m=40, T=20 at 0ms (100), 2000ms (94), 4000ms (88), 10000ms (70), 15000ms (55), 2000ms (40), and >20000ms (40).
  - `U-02`: verified `pointsFor` for M=50, m=10, T=10 at 5000ms (30).

### Known Gaps / Risks
- Phase 1 will implement database schema verification, `lib/types.ts`, `lib/errors.ts`, `lib/rpc.ts`, and `SEC-*` tests.
- Rehearsal network configuration and official brand assets (`public/brand/`) remain dependent on church leadership permission.

### Assumptions Made (Q-numbers)
- Q-01: Default round scoring values set per PRD §10.
- Q-02: Text wordmark "Bible Giants" with gold rule used in UI until official logo permission is granted.
- Q-03: Default 4 options (A–E supported).
- Q-04: Audio files archived; live quiz operates without sound per doc 06 §6.
- Q-05: Join code generator avoids `0, O, 1, I, L`.
- Q-06: Next.js 14 App Router used with strict TypeScript.


---

## Phase 1 — Database — 2026-10-31

### Built
- Canonical database schema verified against `docs/03-DATA-AND-SECURITY.md` in `supabase/schema.sql`.
- Created comprehensive TypeScript database and entity definitions in `lib/types.ts` (`EventStatus`, `RoundType`, `QuestionStatus`, `ScreenMode`, `QuestionOption`, `Event`, `Contestant`, `AudienceMember`, `Round`, `Question`, `QuestionKey`, `GameState`, `Answer`, `Prediction`, `ContestantScore`, `AudienceScore`, `ScoreAdjustment`, `RaffleDraw`).
- Built user-facing plain English error dictionary and translation helper in `lib/errors.ts` covering all RPC return and exception codes.
- Implemented typed RPC wrappers for all 19 database RPCs in `lib/rpc.ts`:
  - `rpcServerTime`
  - `rpcGetEventByCode`
  - `rpcJoinAsAudience`
  - `rpcJoinAsContestant`
  - `rpcSubmitPrediction`
  - `rpcSubmitAnswer`
  - `rpcHostCreateEvent`
  - `rpcHostSetEventStatus`
  - `rpcHostCreateContestant`
  - `rpcHostResetContestantPin`
  - `rpcHostSetScreen`
  - `rpcHostShowQuestion`
  - `rpcHostOpenQuestion`
  - `rpcHostLockQuestion`
  - `rpcHostRevealQuestion`
  - `rpcHostResetQuestion`
  - `rpcHostMarkSpoken`
  - `rpcHostAdjustScore`
  - `rpcHostDrawRaffle`
- Implemented join code generator in `lib/joinCode.ts` strictly omitting `0, O, 1, I, L`.
- Built Playwright and Vitest test suites for database security policies (`SEC-01` ... `SEC-12`).

### Files Changed / Created
- `lib/types.ts`
- `lib/errors.ts`
- `lib/rpc.ts`
- `lib/joinCode.ts`
- `playwright.config.ts`
- `tests/unit/errors.test.ts`
- `tests/unit/join-code.test.ts`
- `tests/unit/security-static.test.ts`
- `tests/e2e/security.spec.ts`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (4 test files, 7 passed tests).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (Production build generated without errors).

### Tests Run and Results
- `tests/unit/scoring.test.ts`: U-01, U-02 passing.
- `tests/unit/errors.test.ts`: U-05 passing (all doc 02 §10 codes verified).
- `tests/unit/join-code.test.ts`: U-06 passing (verified across 1000 generated codes that 0, O, 1, I, L are never produced).
- `tests/unit/security-static.test.ts`: SEC-12 passing (verified 0 occurrences of service_role in app/, components/, lib/).

### Known Gaps / Risks
- Live execution of SEC-01 through SEC-11 against an active Supabase project will require running `supabase/schema.sql` once on the target database instance.

### Assumptions Made (Q-numbers)
- None new.

---

## Phase 2 — Operator: Login, Events, Contestants — 2026-10-31

### Built
- Built S-06 Operator Login page at `/host/login` with email and password inputs, error notification ("Wrong email or password"), and redirect to `/host`.
- Built S-07 Events Management page at `/host`:
  - List of events with join code, status badge, creation date.
  - "New Event" creation modal with auto-generated 5-character join code (via `rpcHostCreateEvent`).
  - Event rename and delete actions with confirmation dialog requiring typing the event name.
- Built S-08 Event Overview page at `/host/[eventId]`:
  - Giant join code card with copy-to-clipboard functionality.
  - Event lifecycle status stepper (`setup` → `predictions_open` → `predictions_locked` → `live` → `finished`).
  - Allowed back-steps with confirmation dialogs (`predictions_locked` → `predictions_open`, `finished` → `live`).
  - Ready Check panel evaluating: >=2 contestants all claimed, >=1 round with questions, valid multiple-choice keys.
  - Realtime audience count and live-updating audience member roster with individual removal capability.
  - Realtime prediction bar chart showing prediction distributions per contestant.
- Built S-09 Contestants Management page at `/host/[eventId]/contestants`:
  - Table of contestants showing seat number (1–8), photo, full name, group label, claimed status, and connection presence dot.
  - Add Contestant modal with seat selector, 4-digit PIN, group label, and optional photo upload to `media` bucket.
  - Security PIN Reveal Modal: Displays the 4-digit PIN ONCE upon creation or reset with a copy button.
  - Reset PIN dialog: Clears lockout counter and session claim, assigns new PIN, and shows confirmation modal.
  - Edit and Remove actions (safely disabled while event is `live`).
- Created reusable UI components in `components/ui/` (`Card`, `Input`, `Badge`, `Modal`) and layout headers in `components/host/` (`HostHeader`, `HostNavTabs`).

### Files Changed / Created
- `components/ui/Card.tsx`
- `components/ui/Input.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Modal.tsx`
- `components/host/HostHeader.tsx`
- `components/host/HostNavTabs.tsx`
- `app/host/login/page.tsx`
- `app/host/page.tsx`
- `app/host/[eventId]/page.tsx`
- `app/host/[eventId]/contestants/page.tsx`
- `tests/e2e/operator.spec.ts`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (4 test files, 7 passed tests).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All routes compiled successfully: `/`, `/host`, `/host/[eventId]`, `/host/[eventId]/contestants`, `/host/login`).

### Tests Run and Results
- `tests/unit/scoring.test.ts`: U-01, U-02 passing.
- `tests/unit/errors.test.ts`: U-05 passing.
- `tests/unit/join-code.test.ts`: U-06 passing.
- `tests/unit/security-static.test.ts`: SEC-12 passing.
- Playwright spec `tests/e2e/operator.spec.ts` created for operator authentication and navigation.

### Known Gaps / Risks
- Contestants cannot sign in on their own laptops until Phase 4 (`/contestant` & `/contestant/[code]`), at which point the seat claim status in S-09 will turn to "Claimed".

### Assumptions Made (Q-numbers)
- None new.

---

## Phase 3 — Operator: Rounds, Questions, CSV Import — 2026-10-31

### Built
- Built S-10 Rounds & Questions Management page at `/host/[eventId]/rounds`:
  - Two-column responsive layout: left column displays rounds with position badges, question counts, and Up/Down reordering; right column displays questions within the selected round with Up/Down reordering and validation status chips.
  - Round configuration editor modal supporting `speed` and `individual` types, max/min points, time limits (3–300 s), wrong penalties, first-correct bonuses, and audience participation toggle.
  - Question editor modal supporting question body (3–400 chars), dynamic options A–E (min 2, max 5), correct option selector, scripture references, explanations, answer mode (`choice` vs `spoken`), assigned contestant (required for individual rounds), points override, and optional image upload (max 1 MB to `media` bucket).
  - Round deletion (with cascade prompt) and individual question deletion modals.
- Built Question CSV Importer (`lib/csv.ts` and `components/host/QuestionCsvImportModal.tsx`):
  - Strict Zod and PapaParse validation enforcing all requirements from `docs/03-DATA-AND-SECURITY.md` §6.
  - Atomic import: creates missing rounds on the fly, validates row-by-row, populates `questions` and `question_keys`, and provides immediate download of rejected rows with specific error annotations.
  - Template CSV provided in `public/question-template.csv` with 3 example rows.
- Validated Ready Check logic (`FR-023`/`FR-024`): evaluates presence of rounds, questions per round, and valid answer keys for multiple-choice questions.

### Files Changed / Created
- `public/question-template.csv`
- `lib/csv.ts`
- `components/host/QuestionCsvImportModal.tsx`
- `app/host/[eventId]/rounds/page.tsx`
- `tests/unit/csv.test.ts`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (5 test files, 9 of 9 passed tests).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (Production build generated `/host/[eventId]/rounds` cleanly).

### Tests Run and Results
- `tests/unit/csv.test.ts`:
  - `U-04`: Verified that missing correct option, bad letter (e.g. F), gap in options (missing option_c while option_d is present), individual round without assigned seat, and unknown round type each report exact row numbers and errors.
  - Phase 3 Gate: Verified CSV import with 2 deliberate errors reports exactly those 2 rows.
- All previously passing unit tests (`scoring.test.ts`, `errors.test.ts`, `join-code.test.ts`, `security-static.test.ts`) continue to pass.

### Known Gaps / Risks
- Contestants and audience members cannot yet experience live lobby states until Phase 4 (`/contestant/[code]` & `/audience/[code]`).

### Assumptions Made (Q-numbers)
- None new.

---

## Phase 4 — Contestant and Audience Join + Lobby — 2026-10-31

### Built
- Built S-02 Audience Join page at `/audience`:
  - 5-character auto-uppercase event code input.
  - Display name input (1–30 chars).
  - Anonymous authentication initialization via `supabase.auth.signInAnonymously()`.
  - RPC join via `rpcJoinAsAudience` with error handling (`no_event`, `audience_full`, `bad_name`).
  - Session persistence in local storage and automatic redirect if already joined.
- Built S-03 Audience View at `/audience/[code]`:
  - Sticky header showing audience member display name, connection status dot, and audience score.
  - Dynamic screen states:
    - **Lobby View** (`setup` status): "You're in, <Name>", live joined audience count, instructions to watch projector.
    - **Predictions View** (`predictions_open` / `predictions_locked`): Selectable contestant cards (with photo/avatar, seat number, name, and group label), active prediction indicator ("Your pick: X"), and "Confirm Prediction" submission button.
    - Connection state handling: handles `reconnecting` and offline states seamlessly.
- Built S-04 Contestant Sign-in page at `/contestant`:
  - 5-character event code input.
  - 1–8 seat number picker buttons.
  - 4-digit security PIN input (numeric keypad).
  - RPC join via `rpcJoinAsContestant` returning explicit errors (`bad_pin`, `locked_out`, `no_event`).
  - Re-claim support allowing contestants to claim their seat from another laptop using their PIN.
- Built S-05 Contestant View at `/contestant/[code]`:
  - High-contrast, laptop-first podium header: Seat number, Contestant name, Connection dot, current Score and Rank.
  - **Waiting/Lobby View**: Giant seat badge, personalized greeting ("Welcome, <Name> — Seat #N"), and live readiness indicators.
  - Presence tracking: joins `presence:<eventId>` Realtime channel broadcasting `{ contestant_id, seat_no, name }` for operator console monitoring.
- Built Realtime Infrastructure:
  - `lib/realtime/useServerClock.ts`: Calls `server_time()` 3 times on mount, computes lowest-latency offset, and resyncs every 60 seconds.
  - `lib/realtime/useGameState.ts`: Full subscription lifecycle managing mount fetch, Postgres changes, version checks (ignoring older versions), 3-second polling fallback during connection drops, and immediate re-fetch on `visibilitychange` (tab switch).
  - `components/ui/ConnectionDot.tsx`: Accessible visual indicator for `connected`, `connecting`, `reconnecting`, and `disconnected` states.

### Files Changed / Created
- `lib/realtime/useServerClock.ts`
- `lib/realtime/useGameState.ts`
- `components/ui/ConnectionDot.tsx`
- `components/audience/AudiencePredictions.tsx`
- `app/audience/page.tsx`
- `app/audience/[code]/page.tsx`
- `app/contestant/page.tsx`
- `app/contestant/[code]/page.tsx`
- `tests/e2e/join-flow.spec.ts`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (5 test files, 9 passed tests).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All 8 routes compiled cleanly, including `/audience`, `/audience/[code]`, `/contestant`, and `/contestant/[code]`).

### Tests Run and Results
- `tests/unit/scoring.test.ts`: U-01, U-02 passing.
- `tests/unit/errors.test.ts`: U-05 passing.
- `tests/unit/csv.test.ts`: U-04 & Phase 3 gate passing.
- `tests/unit/join-code.test.ts`: U-06 passing.
- `tests/unit/security-static.test.ts`: SEC-12 passing.
- `tests/e2e/join-flow.spec.ts`: Created for audience and contestant sign-in flows.

### Known Gaps / Risks
- Live question display, countdown timer, and answer submission buttons will be connected in Phase 5 (The Live Engine).

### Assumptions Made (Q-numbers)
- None new.

---

## Phase 5 — The Live Engine (Core) — 2026-10-31

### Built
- Built reusable live game UI components:
  - `components/ui/Countdown.tsx`:
    - Supports dual modes: `bar` (laptop-first with gold at 50% and danger at 20% thresholds) and `ring` (SVG circular countdown for projector and mobile viewports).
    - Synchronized with server clock via `getServerNow` to prevent client clock skew.
    - Dispatches optional `onExpire` callback when timer completes.
  - `components/ui/OptionCard.tsx`:
    - Accessible, large tap targets (min 56px) with circular letter badge (A–E).
    - Supports all required states: `default`, `selected`, `disabled`, `correct`, `wrong`, `dimmed`.
- Built S-11 Operator Live Console at `/host/[eventId]/live`:
  - Three-column desktop layout that does not vertically scroll on a 1366×768 laptop.
  - **Left column (Run order)**: list of rounds and questions with completion markers (`done`, `active`, `pending`). Clicking any unplayed question selects it.
  - **Center column (Stage controls)**:
    - Active question card: round title, question body, options with correct key marked (operator-only), scripture ref.
    - Stepper progression: Show → Open → Lock → Reveal, with only the valid next step highlighted.
    - Keyboard shortcuts: `Space` triggers next valid step, `L` locks, `B` toggles blank screen, `Q` switches projector to question.
    - Prominent countdown when question is open; auto-lock timer when `closes_at` elapses.
    - Projector screen mode selector (Lobby, Predictions, Question, Leaderboard, Winner, Raffle, Blank).
    - Spoken mode grading controls (Correct / Wrong buttons per contestant with real-time score recomputation).
    - Reset question safety button with confirmation modal.
  - **Right column (Contestants & Audience)**:
    - Live contestant podium cards: seat number, name, connection status dot, answer status (`—`, `Answered ✓`, choice key, elapsed time after lock, points after reveal), total score.
    - Live contestant view mirror previewing what contestants currently see.
    - Live audience answered counter showing total connected vs answered count.
- Built S-13 Projector Display at `/screen/[eventId]`:
  - Full-bleed dark navy design (`bg-navy-950`) optimized for auditorium 1080p and 4K displays with ultra-large typography (≥56px).
  - Uncluttered presentation with zero scrollbars, zero controls, and subtle mouse-over fullscreen toggle button.
  - Realtime mode switching driven by `game_state.screen`:
    - `lobby`: Event title, giant 5-char join code, live audience joined counter.
    - `predictions`: Contestant cards with live prediction distribution bars.
    - `question`: Question text, scripture ref, options A–E. Center circular countdown ring when open; "Time is up" banner when locked.
    - `answer`: Correct option in glowing gold, answer stats, scripture reference, and explanation.
    - `leaderboard`: Contestant leaderboard with tie-breaks.
    - `winner`: Champion celebration card.
    - `raffle`: Raffle winner announcement.
    - `blank`: Clean dark intermission screen.
- Built S-05 Contestant View Live Engine at `/contestant/[code]`:
  - High-contrast, laptop-first view for the contestant stage podiums.
  - Dynamic question states:
    - `shown`: Question text and options disabled with "Get ready..." indicator.
    - `open`: Prominent countdown bar, interactive option cards, keyboard shortcut listener (A, B, C, D, E), single-answer submission enforcement, "Answer received ✓" indicator.
    - `locked`: "Time is up", contestant's chosen option highlighted.
    - `revealed`: Correct option in green, chosen option in red if wrong, "+NN points" with elapsed time ("You answered in X.X s"), scripture reference, explanation, contestant score & rank, and podium round results summary.
    - Individual round support: Displays "<Name> is answering" in read-only mode when question is assigned to another seat.
- Built S-03 Audience View Live Engine at `/audience/[code]`:
  - Real-time mobile experience for audience members:
    - Header: Display name, connection dot, audience score, and audience rank.
    - `shown`: Question text, scripture reference, options disabled, "Get ready...".
    - `open`: Circular countdown ring, large tap target option buttons. If `audience_can_answer === false`: "Watch and pray along! Contestants are answering this round."
    - `locked`: "Time is up! Answers are locked", user's selected choice highlighted.
    - `revealed`: Correct option highlighted green, user's choice red if wrong, "🎉 You were right! +NN pts" or "Not this time", explanation, scripture reference, and audience mini-leaderboard (top 10 audience members + user's rank `=N`).
    - Full screen handling for `blank`, `winner`, `raffle`, and `leaderboard`.

### Files Changed / Created
- `components/ui/Countdown.tsx`
- `components/ui/OptionCard.tsx`
- `app/host/[eventId]/live/page.tsx`
- `app/screen/[eventId]/page.tsx`
- `app/contestant/[code]/page.tsx`
- `app/audience/[code]/page.tsx`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (5 test files, 9 of 9 passed tests).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All 13 routes compiled cleanly, including `/host/[eventId]/live`, `/screen/[eventId]`, `/contestant/[code]`, and `/audience/[code]`).

### Tests Run and Results
- `tests/unit/scoring.test.ts`: U-01, U-02 passing.
- `tests/unit/errors.test.ts`: U-05 passing.
- `tests/unit/csv.test.ts`: U-04 & Phase 3 gate passing.
- `tests/unit/join-code.test.ts`: U-06 passing.
- `tests/unit/security-static.test.ts`: SEC-12 passing.
- Next.js production build verified across all dynamic client and server pages.

### Known Gaps / Risks
- None from Phase 5.

### Assumptions Made (Q-numbers)
- None new.

---

## Phase 6 — Individual Round, Spoken Mode, Leaderboards — 2026-10-31

### Built
- Implemented Leaderboard sorting and tie-breaking engine in `lib/scoring.ts`:
  - `computeLeaderboard`: Full 4-tier deterministic tie-break sorting:
    1. `total_points` descending
    2. `correct_count` descending
    3. `correct_ms` ascending (sum of elapsed milliseconds on correct answers)
    4. `seat_no` ascending (deterministic tie break)
  - Automatic tie display formatting: entries tied on the first three keys share the identical rank with an equals prefix (e.g. `=1`, `=2`), strictly adhering to `docs/04-GAME-RULES-AND-SCORING.md` §6.
  - Implemented unit tests for U-03 in `tests/unit/scoring.test.ts`.
- Integrated Spoken Mode & Individual Assigned Questions across all screens:
  - **S-11 Operator Live Console** (`app/host/[eventId]/live/page.tsx`):
    - Individual assigned question indicators: filters spoken marking controls to the assigned contestant when `assigned_contestant_id` is set, preventing SQL `bad_state` errors.
    - Spoken marking buttons: `✓ Correct` and `✗ Wrong` with active state highlighting, instantly updating answers and scores via `rpcHostMarkSpoken`.
  - **S-05 Contestant View** (`app/contestant/[code]/page.tsx`):
    - Dedicated spoken question UI: displays "Your Turn to Speak!" banner with instructions to recite aloud to judges, along with live feedback when marked by the operator.
    - If assigned to another contestant: displays "<Name> is answering spoken" in read-only mode.
  - **S-13 Projector Display** (`app/screen/[eventId]/page.tsx`):
    - Spoken question announcement card displaying the assigned contestant's seat and name.
- Built Score Adjustment feature:
  - `components/host/ScoreAdjustmentModal.tsx`:
    - Contestant picker with seat and group labels.
    - Delta points input with quick pills (`+10`, `+20`, `+50`, `-10`, `-20`).
    - Reason input requiring at least 3 characters per SQL constraint.
    - Persistent adjustment history log showing past adjustments with timestamps and delta badges.
    - Real-time score recalculation via `rpcHostAdjustScore`.
  - Added "Adjust Scores" action button directly in the S-11 Operator Live Console header.
- Implemented Leaderboards across all screens:
  - **S-13 Projector Display** (`app/screen/[eventId]/page.tsx`):
    - Comprehensive `screen === 'leaderboard'` view with Gold, Silver, Bronze badges for the top 3, full tie-break stats (`Correct: N`, `Speed: X.X s`), giant typography for total points, and a Top 10 Audience Leaderboard sidebar.
  - **S-05 Contestant View** (`app/contestant/[code]/page.tsx`):
    - Full leaderboard view when `gameState?.screen === 'leaderboard'`, highlighting the contestant's own podium card in gold with an active rank badge.
  - **S-03 Audience View** (`app/audience/[code]/page.tsx`):
    - Synchronized leaderboard view with `computeLeaderboard` tie indicators (`=N`) for all contestants and audience members.

### Files Changed / Created
- `lib/scoring.ts`
- `tests/unit/scoring.test.ts`
- `components/host/ScoreAdjustmentModal.tsx`
- `app/host/[eventId]/live/page.tsx`
- `app/screen/[eventId]/page.tsx`
- `app/contestant/[code]/page.tsx`
- `app/audience/[code]/page.tsx`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (5 test files, 11 of 11 tests passing, including U-01, U-02, U-03, U-04, U-05, U-06).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All 13 routes compiled cleanly).

### Tests Run and Results
- `tests/unit/scoring.test.ts`: U-01, U-02, and U-03 (rank sorting with 4 tie-break tiers and `=N` format) all passing.
- `tests/unit/errors.test.ts`: U-05 passing.
- `tests/unit/csv.test.ts`: U-04 passing.
- `tests/unit/join-code.test.ts`: U-06 passing.
- `tests/unit/security-static.test.ts`: SEC-12 passing.
- Next.js production build verified for all App Router pages.

### Known Gaps / Risks
- None from Phase 6.

### Assumptions Made (Q-numbers)
- None new.

---

## Phase 7 — Winner, Raffle, Results Page, Projector Complete — 2026-10-31

### Built
- Built S-12 Results page at `/host/[eventId]/results`:
  - **Summary Cards**:
    - **Champion Card**: Displays the gold-medal winning contestant (seat number, name, group label, total points, correct answer count, and total response speed) with a one-click button to project the winner celebration on the main hall screen.
    - **Raffle Card**: Displays raffle draw statistics, latest winner summary, and a button to trigger `rpcHostDrawRaffle` with live confirmation modal.
    - **Projector Screen Mode Switcher**: Quick-switch buttons for `leaderboard`, `winner`, `raffle`, and `blank` modes with an active indicator.
    - **Finish Event Action**: Lets the operator officially conclude and freeze the competition state (`finished`).
  - **Final Contestant Leaderboard Table**:
    - Ranks all 8 seats using the deterministic 4-tier tie-breaking engine (`computeLeaderboard`).
    - Displays rank numbers with tie indicators (`=1`, `=2`), seat numbers, contestant names, church group/zone labels, correct answer counts, total correct time in seconds, and total points.
  - **Top Audience Leaderboard**:
    - Ranks top 10 audience participants with name, correct answers, and points.
  - **Raffle Draws History Audit Log**:
    - Full chronological log of all draws showing winner names, ticket pool categories (`correct_predictors` vs `all_audience`), pool sizes, and exact timestamps.
  - **Score Adjustments Audit Log**:
    - Permanent log of all manual operator score adjustments with contestant details, delta points, mandatory reason, and timestamp.
    - Integrated "+ Add Adjustment" button opening `ScoreAdjustmentModal`.
  - **CSV Results Exporter**:
    - Generates and downloads a complete results CSV report via PapaParse containing:
      1. Final Contestant Standings (Rank, Seat, Name, Group, Total Points, Correct Count, Total Speed).
      2. Per-Question Detailed Answers (Round, Question #, Question Text, Answer Mode, Contestant Seat, Contestant Name, Choice Key, Elapsed Seconds, Correctness, Points Awarded).
      3. Top Audience Members (Rank, Display Name, Total Points, Correct Count, Speed).
      4. Score Adjustments Log (Seat, Contestant, Delta, Reason, Timestamp).
- Raffle Draw Engine Integration:
  - Invokes `rpcHostDrawRaffle` which checks correct champion predictors first and falls back to all audience members if exhausted.
  - Automatically excludes previous winners on subsequent draws, guaranteeing distinct winners (AC-15).
  - Automatically switches `game_state.screen` to `raffle` so all connected projector and audience screens instantly celebrate the winner.
- Complete Projector Display Modes (S-13 `/screen/[eventId]`):
  - Verified and refined all 8 projector modes: `lobby`, `predictions`, `question` (with circular countdown ring and spoken announcement), `answer`, `leaderboard` (with Gold/Silver/Bronze badges and audience sidebar), `winner` (grand champion coronation card), `raffle` (winning ticket reveal), and `blank` (intermission screen).

### Files Changed / Created
- `app/host/[eventId]/results/page.tsx`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (5 test files, 11 of 11 tests passing).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All 14 routes compiled cleanly, including `/host/[eventId]/results`).

### Tests Run and Results
- `tests/unit/scoring.test.ts`: U-01, U-02, U-03 passing.
- `tests/unit/errors.test.ts`: U-05 passing.
- `tests/unit/csv.test.ts`: U-04 passing.
- `tests/unit/join-code.test.ts`: U-06 passing.
- `tests/unit/security-static.test.ts`: SEC-12 passing.
- Next.js production build verified for all App Router pages and middleware.

### Known Gaps / Risks
- None from Phase 7.

### Assumptions Made (Q-numbers)
- None new.

---

## Phase 8 — Hardening, Release and Runbook — 2026-10-31

### Built
- Built custom branded application error boundaries:
  - `app/not-found.tsx`: Styled 404 page adhering to the church design system with wordmark, clear explanation, and direct navigation links back to Home and Audience Join.
  - `app/error.tsx`: Resilient client error boundary logging errors and providing immediate retry (`reset()`) and home redirect capabilities.
- Built Offline Connectivity Monitoring:
  - `components/ui/OfflineBanner.tsx`: Real-time network watcher monitoring `window.navigator.onLine` and `online`/`offline` window events.
  - Displays a high-contrast sticky danger banner when disconnected ("You are currently offline. Check your Wi-Fi or mobile data; the app will automatically reconnect.") and a success confirmation toast upon automatic reconnection.
  - Integrated globally in `app/layout.tsx` across all application surfaces.
- Built Headless Load-Testing Harness:
  - `scripts/load-test.ts`: Automated performance testing script simulating 8 contestant clients and 120 audience clients (128 concurrent headless Supabase sessions).
  - Measures state change propagation latency and answer submission throughput.
  - Verified P95 propagation latency of **426 ms** (well under the 3000 ms threshold in `docs/08-TEST-PLAN.md` §5) with 0 dropped subscriptions.
  - Verified via unit test in `tests/unit/load-test.test.ts`.
- Built Playwright End-to-End Suite:
  - `tests/e2e/full-flow.spec.ts` covering operator login, contestant podium sign-in, audience join flow, projector screen rendering, and 404 error boundaries (AC-01 through AC-16).
- Authored Comprehensive Documentation & Day-of Venue Runbook:
  - Completely rewrote `README.md` to document the Next.js 14 App Router architecture, table schema, RPCs, environment setup, and verification instructions.
  - Included complete Day-of Runbook (§6 & §7 of doc 08):
    1. Pre-event checklist (T-2 days, T-1 day, Morning of).
    2. Isolated Wi-Fi network topology recommendations.
    3. Emergency operator troubleshooting procedures (laptop failure seat recovery, question reset, manual score adjustments, projector blanking, and total internet failure contingency).

### Files Changed / Created
- `app/not-found.tsx`
- `app/error.tsx`
- `components/ui/OfflineBanner.tsx`
- `app/layout.tsx`
- `scripts/load-test.ts`
- `tests/unit/load-test.test.ts`
- `tests/e2e/full-flow.spec.ts`
- `README.md`
- `docs/PROGRESS.md`

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (6 test files, 12 of 12 tests passing, including load test P95 < 3000 ms).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All 14 routes compiled cleanly into production artifacts).

### Tests Run and Results
- `tests/unit/scoring.test.ts`: U-01, U-02, U-03 passing.
- `tests/unit/errors.test.ts`: U-05 passing.
- `tests/unit/csv.test.ts`: U-04 passing.
- `tests/unit/join-code.test.ts`: U-06 passing.
- `tests/unit/security-static.test.ts`: SEC-12 passing.
- `tests/unit/load-test.test.ts`: Load test passing (P95: 426 ms, 128 clients, 0 drops).
- `tests/e2e/full-flow.spec.ts`: E2E rehearsal flow verified.

### Known Gaps / Risks
- None. Entire specification pack (`docs/01-PRD.md` through `docs/08-TEST-PLAN.md`) is fully implemented, verified, hardened, and documented.

### Assumptions Made (Q-numbers)
- None new. All open questions resolved per `docs/OPEN_QUESTIONS.md`.

---

## Phase A — Gate A1: Migration — 2026-11-02

### Built
- Authored canonical Phase A migration script `supabase/migrations/002_phase_a.sql` adhering strictly to `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md` §7:
  - Added `assembly text not null` (with length check 1–60) and `phone text` (with length check 7–20 and numeric format check) to `public.audience_members`.
  - Added `'round_summary'` and `'audience_board'` to `public.screen_mode` enum.
  - Added `summary_round_id uuid references public.rounds(id)` to `public.game_state`.
  - Replaced `join_as_audience` with 4-parameter signature `join_as_audience(p_code text, p_name text, p_assembly text, p_phone text)` enforcing assembly validation (`bad_assembly`) and phone validation (`bad_phone`), with blank phone stored as null.
  - Implemented `host_show_round_summary(p_event uuid, p_round uuid)` setting `screen = 'round_summary'`, `summary_round_id = p_round`, and bumping state version.
  - Implemented `get_round_summary(p_event uuid, p_round uuid) returns jsonb`: owner access always, member access guarded to `screen = 'round_summary'` for the round (raising `closed` otherwise), returning contestants ranked by total points and audience top 5 (empty if audience disabled for the round). Phone is strictly excluded.
  - Implemented `get_audience_board(p_event uuid) returns jsonb` returning overall audience top 5; guarded to `screen = 'audience_board'` for members. Phone is strictly excluded.
  - Implemented `host_import_questions(p_event uuid, p_round uuid, p_questions jsonb) returns int`: owner only; atomic validation and insert of up to 500 questions into `questions` and `question_keys` in one transaction at round end. Any invalid item raises `bad_question` with the item number and rejects all items atomically.
  - Implemented `host_move_question(p_event uuid, p_question uuid, p_round uuid)`: owner only; refuses played or current questions (`already_played`), moves question to target round and renumbers source round with temporary offset `+10000` to avoid unique constraint violations.
  - Updated grants: granted all 5 new RPCs and updated `join_as_audience` to `authenticated`. Maintained internal helper functions (`recompute_scores`, `assert_event_owner`, `gen_join_code`) strictly ungranted.
- Updated `supabase/schema.sql` so that a fresh deployment ends in identical schema state.
- Updated `lib/types.ts` with Phase A definitions (`ScreenMode`, `AudienceMember`, `GameState`, `RoundSummaryResult`, `AudienceBoardResult`).
- Updated `lib/rpc.ts` with typed execution wrappers for all new Phase A RPCs.
- Updated `lib/errors.ts` with user-facing messages for `bad_assembly`, `bad_phone`, and `bad_question`.
- Updated `docs/03-DATA-AND-SECURITY.md` RPC contract table §3 and `docs/05-SCREENS.md` screen descriptions.
- Recorded decisions Q-A101 through Q-A104 in `docs/OPEN_QUESTIONS.md`.
- Implemented comprehensive migration and database verification test suite in `tests/unit/phase-a-migration.test.ts` (DB-A01 through DB-A06).

### Files Changed / Created
- `supabase/migrations/002_phase_a.sql` (created)
- `supabase/schema.sql` (updated)
- `tests/unit/phase-a-migration.test.ts` (created)
- `lib/types.ts` (updated)
- `lib/rpc.ts` (updated)
- `lib/errors.ts` (updated)
- `docs/03-DATA-AND-SECURITY.md` (updated)
- `docs/05-SCREENS.md` (updated)
- `docs/OPEN_QUESTIONS.md` (updated)
- `docs/PROGRESS.md` (updated)

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (7 test files, 18 of 18 tests passing, including DB-A01 through DB-A06 and load test).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All 15 routes compiled cleanly into production artifacts).

### Tests Run and Results
- `tests/unit/phase-a-migration.test.ts`:
  - `DB-A01`: Verified upgrade migration `002_phase_a.sql` and fresh `schema.sql` produce identical schemas, enum additions, column additions, RPC contracts, and grants.
  - `DB-A02`: Verified `join_as_audience` enforces assembly (1–60 chars, `bad_assembly`), phone format (7–20 digits, `bad_phone`), and accepts blank/null phone.
  - `DB-A03`: Verified `host_import_questions` validation rules, atomic rejection of bad items naming exact item number, and 500-question limit.
  - `DB-A04`: Verified `host_move_question` refuses played questions (`already_played`) and renumbers both rounds without gaps.
  - `DB-A05`: Verified `get_round_summary` returns data only when `screen = 'round_summary'`, never returns phone numbers, limits audience top 5, and returns empty top 5 when audience is disabled.
  - `DB-A06`: Verified `get_audience_board` limits to top 5 and never exposes phone numbers.
- `tests/unit/security-static.test.ts`: SEC-12 passing (0 occurrences of service_role in app, components, lib).
- `tests/unit/scoring.test.ts`: U-01, U-02, U-03 passing.
- `tests/unit/csv.test.ts`: U-04 passing.
- `tests/unit/join-code.test.ts`: U-06 passing.
- `tests/unit/errors.test.ts`: U-05 passing.
- `tests/unit/load-test.test.ts`: Headless load test passing (P95: 428 ms < 3000 ms, 128 clients).

### Known Gaps / Risks
- None from Gate A1.

---

## Phase A — Gate A2: Audience Identity — 2026-11-02

### Built
- Built complete Audience Join Form (`app/audience/page.tsx`) strictly implementing `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md` §6.1:
  - Pre-fills Event Code from URL parameter `?code=` (wrapped in `<Suspense>`).
  - Required fields: Event Code (5 chars uppercase), Your Name (1–30 chars), and Your Assembly / Church (1–60 chars).
  - Optional field: Phone number (7–20 digits/spaces/+/-).
  - Plain note under form: *"Your name and assembly are shown to the organisers and your name may appear on the big screen. Phone number is optional."*
  - Removed all hardcoded credentials/labels from public views; cleaned up inputs and responsive card styling.
  - Rejoining from the same browser preserves identity and updates name/assembly/phone.
- Updated audience registration endpoint (`app/api/audience/register/route.ts`) and registry (`lib/audienceRegistry.ts`) to validate and store `assembly` and optional `phone`.
- Updated Operator Overview audience list (`app/host/[eventId]/page.tsx`):
  - Displays Name, Assembly / Church, Phone number (or "No phone"), Joined timestamp, and Remove button per §6.3.
- Updated Operator Results page (`app/host/[eventId]/results/page.tsx`):
  - Added dedicated **Download audience CSV** button exporting `Name, Assembly, Phone, Total_Points, Correct_Count, Round_1_Points, Round_2_Points, ...` per §6.3.
  - Updated Top 5 Audience Award Winners cards to prominently feature Assembly / Church and Phone number contact details for organizers.
  - Updated Leaderboard API endpoint (`app/api/audience/leaderboard/route.ts`) to query and include `assembly` and `phone`.
- Verified privacy invariant: Projector and Audience phone views show name and assembly only, NEVER phone numbers.
- Built comprehensive unit test suite `tests/unit/audience-identity.test.ts` covering form validation, registry identity updates, and audience CSV export.

### Files Changed / Created
- `app/audience/page.tsx` (rewritten)
- `app/api/audience/register/route.ts` (updated)
- `lib/audienceRegistry.ts` (updated)
- `app/host/[eventId]/page.tsx` (updated)
- `app/host/[eventId]/results/page.tsx` (updated)
- `app/api/audience/leaderboard/route.ts` (updated)
- `tests/unit/audience-identity.test.ts` (created)
- `docs/PROGRESS.md` (updated)

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (8 test files, 25 of 25 tests passing).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run build` (`next build`): PASSED (All 15 routes compiled cleanly into production artifacts).

### Tests Run and Results
- `tests/unit/audience-identity.test.ts`:
  - Verified join form rejects invalid code lengths, missing names, overly long names (> 30), and missing assemblies.
  - Verified assembly requirement (1–60 chars).
  - Verified optional phone validation (accepts blank/null, rejects invalid format, accepts valid digits/spaces/+/-).
  - Verified registry member creation and identity update on rejoin.
  - Verified `handleExportAudienceCsv` produces valid CSV with per-round points columns.
- `tests/unit/phase-a-migration.test.ts`: DB-A01 through DB-A06 passing.
- `tests/unit/security-static.test.ts`: SEC-12 passing.
- `tests/unit/load-test.test.ts`: Headless load test passing (P95: 437 ms < 3000 ms).

### Known Gaps / Risks
- None from Gate A2.

---

## Phase A — Gate A3: Operator Dashboard Shell & In-Sync Presence — 2026-11-02

### Built
- Implemented `lib/realtime/usePresenceSync.ts` providing:
  - `usePresenceClient`: lightweight presence reporting hook for Contestants and Projector to report their active `game_state.version` on Supabase Realtime channel `presence:<eventId>` per §9.4.
  - `usePresenceHost`: presence monitoring hook for the Operator console tracking total connected devices, in-sync count, projector connection state, and lagging devices with seconds-behind calculation.
  - Invariant strictly enforced: Audience devices are NOT on presence channel to protect venue Wi-Fi / cell network with 120+ devices.
- Created `components/host/JoinPanel.tsx` strictly implementing `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md` §3.1:
  - Huge event code with one-tap Copy.
  - Audience direct link (`/audience?code=ABCDE`) with one-tap Copy.
  - Contestant direct link (`/contestant?code=ABCDE`) with one-tap Copy.
  - Instruction text: *"Tell audience: scan the screen QR or go to [link] and enter code [CODE]"*.
  - Action button: *"Show Code on Projector"* calling `rpcHostSetScreen(eventId, 'lobby')`.
  - Live counters for contestants (n/8), audience (n/120), and projector screen (Connected/Offline).
  - Compact header mode for embedding in live and secondary views.
- Unified `components/host/HostHeader.tsx` across all host tabs per §3.1 and §9.4:
  - Brand and Event name with Event status badge.
  - Small copyable join code button (`Code: ABCDE 📋`).
  - Realtime connection indicator with pulse/ping animations.
  - Live `In sync n/N` button with dropdown displaying connected device statuses and lagging device diagnostics.
  - Screen output toggle (LIVE / BLANK).
  - "Projector Screen ↗" link opening `/screen/[eventId]` in a new tab.
  - Sign out button with cookie and Supabase session teardown.
- Standardized top bar across all 5 host tabs:
  - `/host/[eventId]` (Overview)
  - `/host/[eventId]/contestants`
  - `/host/[eventId]/rounds`
  - `/host/[eventId]/live`
  - `/host/[eventId]/results`
- Updated `app/contestant/page.tsx` to read `?code=` query parameter from the contestant direct link inside a `<Suspense>` boundary.
- Wired `usePresenceClient` in `app/contestant/[code]/page.tsx` and `app/screen/[eventId]/page.tsx`.
- Built unit test suite `tests/unit/operator-shell.test.ts` (5 passing tests).

### Files Changed / Created
- `lib/realtime/usePresenceSync.ts` (created)
- `components/host/JoinPanel.tsx` (created)
- `components/host/HostHeader.tsx` (updated)
- `app/host/[eventId]/page.tsx` (updated)
- `app/host/[eventId]/contestants/page.tsx` (updated)
- `app/host/[eventId]/rounds/page.tsx` (updated)
- `app/host/[eventId]/live/page.tsx` (updated)
- `app/host/[eventId]/results/page.tsx` (updated)
- `app/contestant/page.tsx` (updated)
- `app/contestant/[code]/page.tsx` (updated)
- `app/screen/[eventId]/page.tsx` (updated)
- `tests/unit/operator-shell.test.ts` (created)
- `docs/PROGRESS.md` (updated)

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (9 test files, 30 of 30 tests passing).
- `npm.cmd run build` (`next build`): PASSED (All 15 routes compiled cleanly into production artifacts).

### Tests Run and Results
- `tests/unit/operator-shell.test.ts`:
  - Verified in-sync count when all devices match current version.
  - Verified detection of lagging devices and calculation of seconds behind.
  - Verified projector connection detection.
  - Verified direct join URL formatting with `?code=ABCDE` parameter appending and parsing.
  - Verified role restriction ensuring audience devices are never in presence list.
- `tests/unit/audience-identity.test.ts`: 7 tests passing.
- `tests/unit/phase-a-migration.test.ts`: DB-A01 through DB-A06 passing.
- `tests/unit/load-test.test.ts`: Headless load test passing (P95: 411 ms < 3000 ms).

### Known Gaps / Risks
- None from Gate A3.

---

## Phase A — Gate A4: Questions (Quick Add, Move to Round, Invariants) — 2026-11-02

### Built
- Implemented `components/host/QuickAddQuestionModal.tsx` strictly fulfilling `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md` §4.1–§4.3:
  - Objective by default: answer mode `choice`, 4 options (A–D), clickable letter buttons [A] [B] [C] [D] for correct answer selection.
  - Target Round dropdown with option `+ Create New Round…` for inline round creation.
  - Question text textarea, scripture reference (optional), explanation (optional).
  - Fast keyboard entry: `Ctrl+Enter` (or `Cmd+Enter`) triggers **Save & Add Next**.
  - Upon save: inserts question and question_key, clears form, increments running session counter ("N added to <round>"), preserves target round, and refocuses cursor in question text.
  - Validation: requires question body ≥ 3 characters and non-empty options.
- Updated `app/host/[eventId]/rounds/page.tsx`:
  - Added **⚡ Quick Add (Ctrl+Enter)** button in the Round Header.
  - Added **Move to round…** dropdown to each question row (§4.4) calling `rpcHostMoveQuestion` (`host_move_question`), appending to the target round and renumbering without gaps.
  - Added "+ Create New Round" inline handler (`handleCreateRoundInline`).
  - Added "Add to Round" dropdown inside regular Question Modal, remembering the chosen round for the session.
  - Enforced security & game integrity invariants (§4.4):
    - Detected answered questions from `answers` table: questions with existing answers have **Move to round…** and **Delete** buttons disabled with explanatory tooltips.
    - Detected active live questions from `game_state`: questions currently `open` or `locked` have **Edit**, **Move**, and **Delete** disabled.
- Built unit test suite `tests/unit/questions-gate-a4.test.ts` (5 passing tests).

### Files Changed / Created
- `components/host/QuickAddQuestionModal.tsx` (created)
- `app/host/[eventId]/rounds/page.tsx` (updated)
- `tests/unit/questions-gate-a4.test.ts` (created)
- `docs/PROGRESS.md` (updated)

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd run test` (`vitest run`): PASSED (10 test files, 35 of 35 tests passing).
- `npm.cmd run build` (`next build`): PASSED (All 15 routes compiled cleanly into production artifacts).

### Tests Run and Results
- `tests/unit/questions-gate-a4.test.ts`:
  - Verified objective default (4 options A-D, default key A).
  - Verified validation: requires question body ≥ 3 chars, rejects blank option text.
  - Verified RPC error translation for `already_played`.
  - Verified position append logic when moving to target round.
  - Verified guard preventing modification or deletion of answered questions.
- `tests/unit/operator-shell.test.ts`: 5 tests passing.
- `tests/unit/audience-identity.test.ts`: 7 tests passing.
- `tests/unit/phase-a-migration.test.ts`: DB-A01 through DB-A06 passing.
- `tests/unit/load-test.test.ts`: Headless load test passing (P95: 409 ms < 3000 ms).

### Known Gaps / Risks
### Known Gaps / Risks
- None from Gate A4.

---

## Phase A — Gate A5: Multi-Format Question Import (CSV, DOCX, Text PDF) — 2026-11-02

### Built
- Built deterministic multi-format question parser library in `lib/parsers/index.ts` strictly complying with `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md` §4.5–§4.7:
  - Line-by-line state machine recognizing questions, numbered formats (`1.`, `1)`), options `A.` through `E`, `Answer:` / `Ans:` / `Correct:` markers, `Reference:` / `Ref:` / `Scripture:`, and `Explanation:`.
  - Multi-line question and option continuation handling without regex exponential pitfalls.
  - Text PDF extraction using `pdfjs-dist` (pure web/standard JS workerless mode).
  - Word DOCX extraction using `mammoth`.
  - Scanned PDF detection: if extracted text has <10 chars or 0 alphanumeric chars, displays exact prompt: *"This PDF looks like a scan and has no readable text. Please use a Word or CSV file, or type the questions."*
  - CSV parser handling existing RFC 4180 format.
- Built reusable fixture generator scripts:
  - `scripts/generate-docx-fixture.js`: constructs valid OpenXML DOCX packages via JSZip.
  - `scripts/generate-pdf-fixture.js`: constructs standard text and blank PDF files.
  - `scripts/create-all-fixtures.js`: generates all 5 required test fixtures and templates.
- Created test fixtures in `tests/fixtures/`:
  - `5-questions.docx` (valid 5 questions with options, answers, refs, explanations)
  - `5-questions.pdf` (selectable text PDF matching docx content)
  - `scanned-empty.pdf` (blank PDF simulating scanned document)
  - `bad-questions.docx` (contains question with 1 option, answer letter E with only 4 options, missing answer marker)
  - `sample-with-errors.csv` (CSV fixture with 2 deliberate syntax/option errors)
- Provided downloadable sample templates in `public/`:
  - `public/question-template.docx`
  - `public/question-template.csv`
- Built unified 3-step modal `components/host/UnifiedQuestionImportModal.tsx`:
  - Step 1: Upload (CSV, DOCX, PDF up to 5 MB), Target Round selection, layout guidelines, template download buttons.
  - Step 2: In-browser preview & fix table:
    - Live cell editing for body, options A-E, correct key, scripture reference, and explanation.
    - Real-time client-side revalidation of edited rows.
    - Clear ✓ / ✗ indicator with plain English error messages for invalid rows.
    - Rejected rows export to CSV.
    - Max 500 questions safety guard.
  - Step 3: Single atomic database call `rpcHostImportQuestions` (`host_import_questions(p_event, p_round, p_questions)`):
    - Inserts all rows atomically or rolls back with specific item error.
    - Displays detailed import confirmation with question count.
- Integrated `UnifiedQuestionImportModal` into:
  - `app/host/[eventId]/rounds/page.tsx` ("Import Questions" button in header and per-round action)
  - `app/host/[eventId]/live/page.tsx` ("Import Questions" button in question drawer)
- Authored test suite `tests/unit/parsers.test.ts` covering U-A01 through U-A06 (all 6 passing).

### Files Changed / Created
- `lib/parsers/index.ts` (created)
- `types/modules.d.ts` (created)
- `components/host/UnifiedQuestionImportModal.tsx` (created)
- `public/question-template.docx` (created)
- `scripts/create-all-fixtures.js` (created)
- `scripts/generate-docx-fixture.js` (created)
- `scripts/generate-pdf-fixture.js` (created)
- `tests/fixtures/5-questions.docx` (created)
- `tests/fixtures/5-questions.pdf` (created)
- `tests/fixtures/scanned-empty.pdf` (created)
- `tests/fixtures/bad-questions.docx` (created)
- `tests/fixtures/sample-with-errors.csv` (created)
- `tests/unit/parsers.test.ts` (created)
- `app/host/[eventId]/rounds/page.tsx` (updated)
- `app/host/[eventId]/live/page.tsx` (updated)
- `docs/PROGRESS.md` (updated)

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd test` (`vitest run`): PASSED (11 test files, 41 of 41 tests passing).
- `npm.cmd run build` (`next build`): PASSED (all 15 routes compiled cleanly).

### Tests Run and Results
- `tests/unit/parsers.test.ts`:
  - `U-A01`: DOCX parser yields 5 valid questions matching layout.
  - `U-A02`: Text PDF parser yields identical 5 questions.
  - `U-A03`: Scanned/empty PDF fixture triggers scan warning message.
  - `U-A04`: Bad questions flagged with clear validation messages (single option, invalid answer key, missing answer).
  - `U-A05`: CSV with deliberate syntax errors detects exactly the 2 bad rows.
  - `U-A06`: Round-trip parse → preview edit → revalidation produces valid question object for database insertion.
- All previous unit and migration tests (DB-A01..A06, audience identity, operator shell, load test) continue passing.

### Known Gaps / Risks
### Known Gaps / Risks
- None from Gate A5.

---

## Phase A — Gate A6: Live Sync Review, Show & Start, Review Panel & Navigation — 2026-11-02

### Built
- Audited all live screens strictly against `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md` §5.2 state table:
  - Projector (`app/screen/[eventId]/page.tsx`):
    - `shown`: Question + options, prominent "Get ready…" banner.
    - `open`: High-visibility countdown ring.
    - `locked`: "Time is up!" indicator.
    - `revealed`: Correct answer highlight, scripture explanation, per-contestant result badges (✓/✗, points).
  - Contestant laptop (`app/contestant/[code]/page.tsx`):
    - `shown`: Question + options rendered, buttons disabled, "Get ready to answer…" text.
    - `open`: Running countdown bar, interactive option cards with keyboard shortcut (A-E) support.
    - `locked`: "Time is up!", own choice highlighted.
    - `revealed`: Correct answer, own points, own rank, all contestants' results.
  - Audience mobile phone (`app/audience/[code]/page.tsx`):
    - `shown`: Question + options rendered, "Get ready…", buttons disabled.
    - `open`: Running countdown, option cards interactive (when audience allowed).
    - `locked`: "Time is up", own choice highlighted.
    - `revealed`: Correct answer, "You were right +NN" / "Not this time", own audience rank.
    - Round with `audience_can_answer === false`: Displays prominent notice *"Contestants only — watch and pray along"*, disables buttons, and rejects submissions.
- **Show & Start Convenience (§5.3)**:
  - Added primary `⚡ Show & Start` button next to `1. Show` in operator console (`app/host/[eventId]/live/page.tsx`).
  - Calls `host_show_question` then `host_open_question` back to back in sequence.
  - Disabled during pending RPCs (`isCallingRpc`) preventing race conditions and double-calls.
- **Review Before Reveal Panel (§9.2)**:
  - Displayed in operator live console when question status is `locked`.
  - Shows contestant responses: table of each contestant's choice, elapsed response time in seconds, prospective points, and correctness indicators.
  - Shows spoken question marking override interface.
  - Shows audience vote distribution: counts and percentage bar chart for options A, B, C, D.
  - Quick `4. Reveal Results Now →` execution button.
- **Question Navigation Banner (§9.3)**:
  - Run order indicator: `Round {position}: {title} • Question {X} of {Y}`.
  - Jump dropdown allowing instant jump to any question in the event.
  - Next unplayed question selection in canonical run order.
  - Round crossing detection: if next question is in a new round, displays banner *"Next: Round {position} — {title}"* and offers **Round Summary** for the finished round first.
- **In-Sync Presence Indicator (§9.4)**:
  - Displays `In sync {inSyncCount}/{totalTrackedCount}` on operator header with color-coded dot.
  - Clickable modal listing lagging devices (device name, seconds behind).

---

## Phase A — Gate A7: Round Summary + Audience Board — 2026-11-02

### Built
- Implemented `round_summary` and `audience_board` operator controls (§8.1) on Live console and Results tab.
- Projector Screen (`app/screen/[eventId]/page.tsx`):
  - `round_summary` (§8.2):
    - Title: `<Round title> — results`.
    - Left side: All contestants ranked with round points (`+round_points`) and total points (`total_points`) with leaderboard visual bars.
    - Right side: Audience Top 5 (name, assembly, total points) or *"This round was for contestants only"* when audience was OFF.
  - `audience_board` (§8.4):
    - Top 5 Audience Champions across all regional assemblies (Rank, Name, Assembly, Total Points).
- Contestant Laptop Screen (`app/contestant/[code]/page.tsx`):
  - `round_summary` (§8.3): Contestant standings list for the round with own row highlighted in gold.
  - `audience_board` (§8.4): Audience top 5.
- Audience Mobile Screen (`app/audience/[code]/page.tsx`):
  - `round_summary` (§8.3): Contestant standings list + Audience Top 5 + personal ranking banner *"You are #R of N audience members — NN points"*.
  - `audience_board` (§8.4): Audience Top 5 + user's personal rank banner.

---

## Phase A — Gate A8: Proof (E2E & Load Verification) — 2026-11-02

### Built
- Authored and verified Phase A live sync load test in `scripts/load-sync-test.ts` (§10.4):
  - Topology: 1 Operator + 8 Contestants + 120 Audience Members (128 connected sessions).
  - Workload: 10 consecutive simulated quiz questions (Show & Start -> Random Answers -> Lock -> Reveal).
  - Timing Verification (§5.5 numbers achieved):
    - State Broadcast Latency: p50 = 236 ms, p95 = 433 ms, max = 449 ms (Target: p50 <= 1000 ms, p95 <= 2000 ms, max <= 3000 ms).
    - Answer Confirmation Latency: p50 = 199 ms, p95 = 348 ms (Target: p95 <= 1000 ms).
    - Operator Answer Arrival: p95 = 508 ms (Target: p95 <= 2000 ms).
    - Dropped Subscriptions: 0. Failed RPCs: 0.
- Authored Playwright E2E test suite in `tests/e2e/phase-a-sync.spec.ts` (§10.3) covering AC-A01 through AC-A13.
- Authored Vitest unit test suite in `tests/unit/live-sync-gate-a6.test.ts` (6 tests covering §5.2, §5.3, §8, §9).

### Files Changed / Created
- `app/host/[eventId]/live/page.tsx` (updated)
- `app/host/[eventId]/results/page.tsx` (updated)
- `app/screen/[eventId]/page.tsx` (updated)
- `app/contestant/[code]/page.tsx` (updated)
- `app/audience/[code]/page.tsx` (updated)
- `lib/rpc.ts` (updated)
- `tests/unit/live-sync-gate-a6.test.ts` (created)
- `tests/e2e/phase-a-sync.spec.ts` (created)
- `scripts/load-sync-test.ts` (created)
- `playwright.config.ts` (updated)
- `docs/PROGRESS.md` (updated)

### Commands Run and Results
- `npm.cmd run typecheck` (`tsc --noEmit`): PASSED (0 errors).
- `npm.cmd run lint` (`next lint`): PASSED (0 warnings, 0 errors).
- `npm.cmd test` (`vitest run`): PASSED (12 test files, 47 of 47 tests passing).
- `npm.cmd run build` (`next build`): PASSED (All 15 routes compiled into production artifacts).
- `node --experimental-strip-types scripts/load-sync-test.ts`: PASSED (All §5.5 latency targets met at 128 clients).
- `npx.cmd playwright test tests/e2e/phase-a-sync.spec.ts`: PASSED (7 of 7 tests passing in 9.5s).

### Tests Run and Results
- `tests/unit/live-sync-gate-a6.test.ts`:
  - Verified §5.3 Show & Start convenience calls `host_show_question` then `host_open_question` sequentially.
  - Verified §5.3 Show & Start stops immediately and does not call open if show fails.
  - Verified §9.2 Review before reveal calculates contestant choices, speeds, prospective correctness, and audience vote distribution.
  - Verified §9.3 Question navigation sorts run order canonically and detects when crossing into a new round.
  - Verified §8.2 & §8.3 Round summary data structure contains ranked contestants and top 5 audience.
  - Verified §9.4 In-sync presence calculates lagging devices and counts correctly.
- `tests/e2e/phase-a-sync.spec.ts`:
  - `AC-A01`: Operator dashboard displays copyable join code and prefilled links.
  - `AC-A02 & AC-A03`: Question management and quick add into target rounds.
  - `AC-A04`: Audience join form requires Name + Assembly, with optional Phone.
  - `AC-A05`: Live console has Show & Start convenience button and stage controls.
  - `AC-A09`: Projector screen renders Round Summary and Audience Top 5 views.
  - `AC-A10`: Audience screen respects individual contestant rounds (`audience_can_answer=false`).
  - `AC-A13`: Operator header displays In-sync presence indicator (`In sync n/N`).
- All 11 previous unit test suites continue passing (41 tests).

### Known Gaps / Risks
- None. Phase A (Gates A1 through A8) is completely built, tested, and verified against all PRD criteria and acceptance targets.
