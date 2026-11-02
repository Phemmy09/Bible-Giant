# 01 — Product Requirements Document (PRD): Bible Giants

Version 1.0 · Status: LOCKED SCOPE

## 1. Purpose
Bible Giants is a live Bible quiz competition used at the camp meeting for the Ondo and Ekiti
region (hosted around Ado Ekiti), prepared for the Apostolic Faith church under the authority of
church leadership. A small group of contestants compete on their own laptops while an operator
runs the show from a control console and a projector screen displays the action to the hall.
The audience can join on their phones with a code, predict the winner, and answer along.

## 2. Goals
G1. The operator can run an entire competition (6–8 rounds) smoothly from one console.
G2. All contestants see each question at the same moment and answer on their own laptop.
G3. Faster correct answers earn more points; slower correct answers still earn some.
G4. The hall sees a clear, classy, large-type projector screen at every moment.
G5. The audience can join with a code, predict the winner, answer along, and enter a raffle.
G6. It is reliable: works on a modest network, survives refreshes and short disconnects.

## 3. Non-goals (OUT OF SCOPE — do not build)
Native mobile apps · payments · chat/comments · social login · email/SMS · multiple operators or
roles beyond the single operator · team (group) scoring · AI-generated questions · analytics
dashboards · languages other than English · offline mode · video/audio playback · public leaderboards
outside an event · user profiles outside an event · dark/light theme toggle.

## 4. Roles
| Role | Who | Device | Sign-in |
|---|---|---|---|
| Operator | 1 person runs the event | Laptop | Email + password (Supabase Auth) |
| Contestant | 4–8 per event | Own laptop | Event code + seat number + 4-digit PIN set by operator |
| Audience | up to 120 per event (configurable) | Phone | Event code + display name |
| Projector screen | The hall | Operator's laptop (second display) or any laptop signed in as operator | Operator account |

## 5. Event lifecycle (`events.status`)
`setup` → `predictions_open` → `predictions_locked` → `live` → `finished`
- `setup`: operator creates rounds, questions, contestants. Audience may already join (lobby).
- `predictions_open`: audience can choose a predicted winner (and change it).
- `predictions_locked`: predictions frozen. Operator starts the contest.
- `live`: rounds are run. Contestants can answer.
- `finished`: final standings, winner, raffle draw.
The operator moves between statuses by explicit buttons. Allowed transitions ONLY:
`setup → predictions_open`, `setup → live` (skip predictions), `predictions_open → predictions_locked`,
`predictions_locked → live`, `live → finished`, plus two back-steps each with a confirmation dialog:
`predictions_locked → predictions_open` and `finished → live`.

## 6. Functional requirements

### 6.1 Operator account and events
- FR-001 Operator signs in with email and password at `/host/login`. Anonymous users cannot reach `/host/*`.
- FR-002 Operator can create an event (name) → system generates a 5-character join code
  (letters/digits, no 0 O 1 I L) and shows it prominently.
- FR-003 Operator sees a list of their events and can open, rename, or delete one (delete asks to type the event name).
- FR-004 Operator sets the audience cap (default 120).

### 6.2 Setup: contestants
- FR-010 Operator adds 2–8 contestants: name, assembly/group label (optional), seat number
  (1–8, unique), 4-digit PIN. Photo upload is optional (small image, max 1 MB).
- FR-011 Operator can edit a contestant, reset a PIN, or remove a contestant (only while event is not `live`).
- FR-012 Operator sees for each contestant: claimed/not claimed (has signed in), connected/not connected.

### 6.3 Setup: rounds and questions
- FR-020 Operator creates 1–12 rounds, ordered. Each round has: title, type (`speed` or `individual`),
  max points (default 100), min points (default 40), time limit seconds (default 20),
  wrong-answer penalty (default 0), first-correct bonus (default 0), audience can answer (default yes).
  For `individual` rounds min points is ignored (points are fixed), so max points may be below min points.
- FR-021 Operator adds questions to a round (add, edit, delete, reorder). Fields: question text,
  2–5 options with keys A–E, correct option, scripture reference (optional), explanation (optional),
  image (optional, max 1 MB), answer mode (`choice` default or `spoken`), and for `individual` rounds
  the contestant the question is assigned to.
- FR-022 Operator can import questions from a CSV file (format in `03-DATA-AND-SECURITY.md` §6)
  with a preview and row-level error list before confirming. Downloadable CSV template provided.
- FR-023 System validates: every `choice` question has a correct option; keys are unique; round
  has at least one question before it can be run. Problems are listed in a "Ready check" panel.
- FR-024 "Ready check" panel (per event) must show green before `live`: ≥2 contestants all claimed,
  ≥1 round with questions, no validation errors.

### 6.4 Audience and predictions
- FR-030 Audience opens `/audience`, enters the code and a display name (1–30 chars) and joins.
  Re-joining from the same browser restores the same identity.
- FR-031 Operator sees the audience list grow live (names + count + cap).
- FR-032 While `predictions_open`, each audience member picks ONE contestant as predicted winner and
  may change it until `predictions_locked`.
- FR-033 Operator sees prediction counts per contestant (live bar list). Projector can show them.
- FR-034 After the event is finished, operator can run a raffle draw (see 6.8).

### 6.5 Running a speed round
- FR-040 Operator selects a question and presses **Show** → all contestant and audience screens
  and the projector display the question text and options (answers disabled, timer not started).
- FR-041 Operator presses **Open** → the timer starts (server time) and everyone can answer.
- FR-042 Each contestant (and audience member if allowed) can answer ONCE. The first answer is final.
- FR-043 The question locks automatically when the time limit expires, or when the operator presses
  **Lock**. The server rejects answers after the limit regardless of what the client does.
- FR-044 Operator presses **Reveal** → correct answer shown on every screen, points awarded,
  scores updated, per-contestant results shown (correct / wrong / no answer, points, time).
- FR-045 Operator can show the **Leaderboard** on the projector at any time.
- FR-046 Operator can **Reset question** (emergency): deletes that question's answers and returns it to `shown`.

### 6.6 Running an individual round
- FR-050 Each question in an `individual` round is assigned to one contestant.
- FR-051 When shown, all screens display the question and who it is for. Only the assigned
  contestant can answer (if `choice` mode). Others see "<Name> is answering".
- FR-052 Points are fixed (round max points, or the question's points override) — NOT speed based.
- FR-053 `spoken` mode: contestant answers aloud; the operator marks Correct or Wrong with two buttons.
  The operator can change a mark until the next question is shown, and later via score adjustment.

### 6.7 Scoring and standings
- FR-060 Scoring follows `04-GAME-RULES-AND-SCORING.md` exactly and runs in the database.
- FR-061 Contestants see their own score, rank, and the full leaderboard after each reveal.
- FR-062 Audience has a separate leaderboard (audience points never affect contestants).
- FR-063 Operator can adjust a contestant's score by ± points with a required reason (logged).
- FR-064 Tie-break order: total points, then more correct answers, then lower total time on correct answers.

### 6.8 Winner and raffle
- FR-070 Operator can show **Winner** on the projector (top of leaderboard, handles ties by tie-break).
- FR-071 Raffle: picks one random audience member among those who predicted the final winner;
  if nobody did, among all audience. Previously drawn winners are excluded from later draws.
  The result is stored and shown on the projector with the winner's display name.

### 6.9 Projector screen
- FR-080 `/screen/[eventId]` shows what the operator selects: lobby (event name + very large join code + joined count),
  predictions, question (live timer), answer reveal, leaderboard, winner, raffle, blank.
- FR-081 Screen follows `game_state.screen`; the operator changes it from the console (and it changes
  automatically on Show → `question` and Reveal → `answer`).
- FR-082 Screen is read-only, uses very large type, and has no controls except a small hidden "full screen" toggle.

### 6.10 Operator live console
- FR-090 Console shows: connection status, event status, rounds/questions list with status markers,
  the current question with big step buttons (Show / Open / Lock / Reveal), a live per-contestant
  answer panel (answered?, chosen option, elapsed time), audience count, and a mini-leaderboard.
- FR-091 The operator can see exactly what contestants see (a "Contestant view" mirror of the
  current question and state) next to the controls.
- FR-092 Keyboard: `Space` = perform the next valid step for the current question; `L` leaderboard;
  `B` blank; `Q` question view. Shortcuts are ignored while typing in an input.

### 6.11 Contestant screen
- FR-100 Contestant signs in at `/contestant` with code + seat + PIN and stays signed in on refresh.
- FR-101 Shows: lobby/waiting state, the question and options when shown, a countdown when open,
  big answer buttons, "Answer received" confirmation, reveal with correct answer and own points,
  own score and rank, and the leaderboard.
- FR-102 Contestant never sees other contestants' choices until reveal.

### 6.12 Audience screen
- FR-110 Audience phone shows: lobby, prediction picker (when open), the question + options + countdown
  (when allowed), confirmation, reveal with whether they were right and their audience points, and the
  audience leaderboard (top 10 + own rank).

## 7. Non-functional requirements
- NFR-01 Capacity: 8 contestants + 120 audience at once without degradation.
- NFR-02 Latency: operator action → all screens updated within 1.5 s on normal network (3 s worst case).
- NFR-03 Answer submit → confirmation within 1 s on normal network.
- NFR-04 Refresh at any moment restores the right screen within 3 s.
- NFR-05 Browsers: latest Chrome and Edge on laptops; Chrome and Safari on phones (iOS 16+, Android 10+).
- NFR-06 Responsive: contestant and audience screens work from 360 px wide up; host console and projector from 1280 px wide.
- NFR-07 Readability: body text ≥16 px, projector question text ≥56 px, contrast ≥ 4.5:1.
- NFR-08 Free tier only: Vercel Hobby, Supabase Free. No paid services.
- NFR-09 No answer leakage (see SEC tests). No secret keys in the browser.
- NFR-10 Data is never lost on refresh/disconnect: all state is in the database.

## 8. Acceptance criteria (the project is accepted only when ALL pass)
- AC-01 Operator can sign in, create an event, and see a join code.
- AC-02 Operator can add contestants and each contestant can sign in with seat + PIN on a separate browser.
- AC-03 Operator can create rounds, add questions manually, and import them from CSV with error reporting.
- AC-04 Audience can join with the code on a phone-sized browser; operator sees them appear within 3 s.
- AC-05 Predictions can be made, changed, locked; operator sees counts.
- AC-06 In a speed round, all contestants see the question at the same time after Show, and can answer only after Open.
- AC-07 Faster correct answers get strictly more points than slower correct answers per the formula; wrong = 0 (or penalty); no answer = 0.
- AC-08 Answers after the time limit are rejected by the server; second answers are rejected.
- AC-09 Reveal shows the correct answer, per-contestant results, and updates scores on all screens.
- AC-10 Individual round: only the assigned contestant can answer; spoken mode marking works.
- AC-11 Leaderboard ordering and tie-break match the rules.
- AC-12 Projector screen mirrors the operator's selected view for every screen mode.
- AC-13 Refresh of host, contestant, audience, and projector at each question status restores the correct view.
- AC-14 A contestant who disconnects and reconnects (even mid-question) can still answer if time remains.
- AC-15 Raffle draws a valid winner and excludes previous winners.
- AC-16 No answer leakage: inspecting network and client state before reveal never exposes the correct key.
- AC-17 A full 8-round mock event with 6 contestants + 30 audience completes with no errors (rehearsal).
- AC-18 Production build deploys on Vercel and works against the Supabase project.

## 9. Decisions already made (do not reopen)
- D-01 Single operator account; contestants and audience use Supabase anonymous auth + RPC join.
- D-02 Realtime via Supabase Realtime (Postgres Changes) + 3 s polling fallback. No custom websocket server.
- D-03 Scoring is done in SQL at Reveal. Contestant time = server receive time − server open time.
- D-04 Network latency differences between laptops are NOT compensated; rehearsal must use the real network.
- D-05 Projector screen is the operator-signed-in `/screen/[eventId]` page (no separate screen token).
- D-06 One answer per participant per question; first answer final.
- D-07 Audience points are separate from contestant points.
- D-08 English only; Africa/Lagos time displayed where time appears.

## 10. Open questions (defaults apply unless the owner changes them)
- Q-01 Default points: max 100, min 40, limit 20 s. (Operator can change per round.)
- Q-02 Official church logo/images: owner must obtain permission from leadership and supply files in `public/brand/`. Until then use a plain text wordmark "Bible Giants".
- Q-03 Number of options per question: 2–5, default 4.
