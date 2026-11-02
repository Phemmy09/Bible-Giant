# 05 — Screens (every one MUST be built and work)

Conventions: "Realtime" = updates from `game_state` and related tables without refresh. Every screen
has Loading (spinner + text), Empty, and Error states. All text plain English. All buttons show a
disabled/pending state while calling the server.

---
## S-01 Landing `/`
- Wordmark "Bible Giants" (logo area at top), subtitle "Ondo & Ekiti Camp Meeting".
- Three large buttons: **I am a Contestant**, **I am in the Audience**, **Operator**.
- Footer: small text "Apostolic Faith".

## S-02 Audience join `/audience`
- Fields: Event code (5 chars, auto-uppercase, pre-filled when `?code=` in URL), Your name (1–30, required), Your assembly / church (1–60, required), Phone number (optional, 7–20 characters).
- Plain note: "Your name and assembly are shown to the organisers and your name may appear on the big screen. Phone number is optional."
- Button **Join**. Errors: "We could not find that code", "This event is full", "Please enter your name", "Please enter your assembly or church", "Invalid phone number".
- On success → `/audience/[code]`. If already joined in this browser → redirect straight there. Rejoining updates name, assembly, and phone.

## S-03 Audience view `/audience/[code]`
Single page that switches view by `events.status` + `game_state`:
1. **Lobby** (event `setup`/not live, screen `lobby`): "You're in, <name>", count joined, "The competition will begin soon".
2. **Predictions** (`predictions_open`): list of contestants (photo, name, group) as selectable cards; **Confirm prediction** button; shows "Your pick: X" after saving, changeable until locked. After lock: "Predictions are closed. You picked X."
3. **Question** (`shown`): question text + options (disabled) + "Get ready".
4. **Open**: countdown ring, option buttons (large tap targets). After tap: option highlighted + "Answer received". If round has `audience_can_answer = false`: "Watch and pray along" and no buttons.
5. **Locked**: "Time is up".
6. **Revealed**: correct option highlighted; "You were right! +NN" or "Not this time"; short explanation if present; mini leaderboard of audience (top 5 + your rank).
7. **Round summary / Audience board / Leaderboard / Winner / Raffle** (when `screen` is those): round summary (standings + own audience rank), overall top 5 audience, contestant leaderboard, winner card, or raffle result.
- Header always shows: name, connection dot (green/red), audience points. Phone is NEVER shown.

## S-04 Contestant sign-in `/contestant`
- Fields: Event code (pre-filled when `?code=` in URL), Seat number (1–8 picker), PIN (4 digits, numeric keypad on mobile).
- Button **Enter**. Errors: "Wrong PIN", "Too many attempts — ask the operator to reset your PIN", "No event found".

## S-05 Contestant view `/contestant/[code]`
Large-type, laptop-first, zero distractions.
1. **Waiting**: "Welcome <name> — seat N". Connection dot. Lobby text.
2. **Shown**: question text, options A–E as big cards (disabled), "Get ready…".
3. **Open**: big countdown bar + seconds, options as big buttons (keys A–E also work from the keyboard). Clicking sends the answer; card shows "Sending…" then "Answer received ✓". Other options become disabled.
   - Individual round, not assigned to me: "<Name> is answering" + question text read-only.
4. **Locked**: "Time is up" + my choice highlighted (or "No answer").
5. **Revealed**: correct option in green, my option red if wrong; "+NN points" with elapsed time ("You answered in 3.4 s"); explanation; **my rank and score**; all contestants' results row list (name, correct/wrong/none, +points).
6. **Round summary / Leaderboard**: contestant standings list with own row highlighted.
7. **Winner / Raffle / Blank** when `screen` says so (blank = dark neutral screen).
- Header: name, seat, score, rank, connection status. Never shows other contestants' choices before reveal. Presence reports applied version for the operator in-sync indicator.

## S-06 Operator login `/host/login`
- Email, password, **Sign in**. Error: "Wrong email or password". Redirects to `/host`.

## S-07 Events `/host`
- List of events (name, join code, status, created date). **New event** (name field → creates, opens it).
- Each row: **Open**, **Rename**, **Delete** (type event name to confirm). **Sign out** in header.

## S-08 Event overview `/host/[eventId]`
- **Join panel** (always visible at top):
  - Event code (huge, one code for both contestants & audience) + **Copy** button.
  - Audience link `https://<site>/audience?code=ABCDE` + Copy button.
  - Contestant link `https://<site>/contestant?code=ABCDE` + Copy button.
  - Instruction line: "Contestants: enter this code, your seat number and your PIN. Audience: enter this code and your name."
  - **Show code on projector** button (sets projector to `lobby`).
  - Live counters: contestants signed in n/N · audience joined n/cap · projector connected yes/no.
- Unified top bar on every tab: event name, status chip, connection status, join code (small, copyable), in-sync indicator ("In sync n/N").
- Status stepper: Setup → Predictions open → Predictions locked → Live → Finished, with the one valid next button.
- **Ready check** panel (FR-023/024) listing each issue with a link to fix it; green when OK.
- Cards: Contestants (n/8, n claimed), Rounds (n, questions n), Audience (n/cap).
- Audience list (live, scrollable, name + assembly + phone + joined time) with a **Remove** button per member (phone visible to host only).
- Prediction counts per contestant (live bars) when predictions exist.
- Navigation tabs: Overview · Contestants · Rounds · Live console · Results.

## S-09 Contestants `/host/[eventId]/contestants`
- Table: seat, photo, name, group, claimed ✓/—, connected ●/○, actions (Edit, Reset PIN, Remove).
- **Add contestant** form (name, group, seat, 4-digit PIN, optional photo). PIN is shown ONCE in a confirmation box with a copy button.
- Disabled editing while event is `live` (except Reset PIN).

## S-10 Rounds & questions `/host/[eventId]/rounds`
- Left: rounds list (drag handles or Up/Down buttons to reorder), **Add round**.
- Round editor: title, type, max/min points, time limit, wrong penalty, first-correct bonus, toggle "Audience can play this round" (`audience_can_answer`).
- Right: questions of the selected round, each row: number, text preview, correct key, scripture, assigned contestant (individual), status icon. Up/Down reorder, Edit, Delete, **Move to round…** (dropdown).
- Question creation defaults: answer mode `choice`, 4 options (A–D), correct answer chosen by clicking a letter. "Add to round" dropdown remembers last chosen round.
- **Quick add mode**: compact form with round dropdown, question text, options A–D, correct letter buttons, scripture ref, explanation. `Ctrl+Enter` or **Save & add next** saves, clears, keeps the round, and focuses the question box.
- **Import dialog** (CSV, Word `.docx`, PDF text):
  - Step 1: Choose file & round dropdown.
  - Step 2: In-browser parse, preview & fix table (editable cells, plain-language problem flags, N ready, M need attention).
  - Step 3: Single atomic database call (`host_import_questions`). Download rejected rows if any.
- Editing/moving/deleting blocked for questions currently open/locked or already played.

## S-11 Live console `/host/[eventId]/live`  (the operator's main screen)
Three-column layout (≥1280 px), nothing scrolls on a 1366×768 laptop for the primary controls.
- **Top bar**: event name, status chip, connection status (green "Live" / red "Reconnecting…"), join code, in-sync indicator ("In sync n/N" with popup showing lagging devices), contestants connected n/N, audience n.
- **Left column — Run order**: rounds and questions list with status markers. Click a question to select it. Round headers show type.
- **Center column — Stage controls**:
  - Current question card: round name, question number, text, options with correct one marked (operator only), scripture ref.
  - Status chip and countdown when open.
  - Big step buttons: **Show** and **Show & Start** (calls show then open sequentially) → **Open** → **Lock** → **Reveal**. Secondary: **Reset question** (confirm).
  - Review before reveal panel: after Lock, shows contestants' answers, elapsed seconds, and audience vote distribution bar chart (A/B/C/D).
  - Question navigation: **Next question** selects next unplayed question; if entering a new round, a banner announces "New round: <title>" and offers **Round summary** for finished round first.
  - Projector controls: **Lobby · Predictions · Question · Answer · Leaderboard · Round summary · Audience top 5 · Winner · Raffle · Blank**.
- **Right column — Contestants**: live contestants cards with answer status, elapsed time, points, and score.
- **Bottom — Audience mini-panel**: joined count, answered count, vote distribution.

## S-12 Results `/host/[eventId]/results`
- Final contestant leaderboard with tie-break columns (points, correct, total correct time).
- Score adjustments: form + log table.
- Winner button, **Round summary** button, **Audience top 5** button.
- Audience leaderboard (top 5 with name, assembly, points).
- **Download audience CSV** (name, assembly, phone, total points, correct count, per-round points).
- Raffle: **Draw winner** button, history list of draws.
- Export: **Download results CSV** (contestant leaderboard + per-question results).

## S-13 Projector `/screen/[eventId]`
Dark navy full-bleed, very large type, no scrollbars, fullscreen button bottom-right.
Modes (follows `game_state.screen`):
- **lobby**: event name, big join code, "Join the competition", audience joined count.
- **predictions**: "Who will win?" with contestants and live prediction counts.
- **question**: round title, question text (≥56 px), options cards, countdown ring when open, "Get ready" when shown, "Time is up" when locked.
- **answer**: correct option highlighted, scripture reference, explanation, per-contestant row with ✓/✗, points, time.
- **round_summary**: "<Round title> — results", left: all contestants ranked with round points and total points; right: Audience top 5 (name, assembly, total points) or "Contestants only" notice.
- **audience_board**: Overall audience top 5 (name, assembly, total points).
- **leaderboard**: contestants ranked with animated bars and points.
- **winner**: champion name large with photo, final score, second and third listed.
- **raffle**: "Raffle winner" and winner name large.
- **blank**: plain navy with the small wordmark.
- Updates in place with 300 ms fade. Presence reports applied version for operator in-sync tracking. Shows "Reconnecting…" badge when offline.

## S-14 Global error and 404
- Friendly page with a **Go home** button. Network-offline banner across the top of every page when `navigator.onLine` is false.
