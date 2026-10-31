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
- Phase 8 will focus on hardening, error/404 handling, offline banners, full accessibility pass, and deployment runbooks.

### Assumptions Made (Q-numbers)
- None new.



