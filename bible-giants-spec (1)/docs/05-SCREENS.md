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
- Fields: Event code (5 chars, auto-uppercase), Your name (1–30).
- Button **Join**. Errors: "We could not find that code", "This event is full", "Please enter your name".
- On success → `/audience/[code]`. If already joined in this browser → redirect straight there.

## S-03 Audience view `/audience/[code]`
Single page that switches view by `events.status` + `game_state`:
1. **Lobby** (event `setup`/not live, screen `lobby`): "You're in, <name>", count joined, "The competition will begin soon".
2. **Predictions** (`predictions_open`): list of contestants (photo, name, group) as selectable cards; **Confirm prediction** button; shows "Your pick: X" after saving, changeable until locked. After lock: "Predictions are closed. You picked X."
3. **Question** (`shown`): question text + options (disabled) + "Get ready".
4. **Open**: countdown ring, option buttons (large tap targets). After tap: option highlighted + "Answer received". If round has `audience_can_answer = false`: "Watch and pray along" and no buttons.
5. **Locked**: "Time is up".
6. **Revealed**: correct option highlighted; "You were right! +NN" or "Not this time"; short explanation if present; mini leaderboard of audience (top 10 + your rank).
7. **Leaderboard/Winner/Raffle** (when `screen` is those): the contestant leaderboard, winner card, or raffle result ("Congratulations <name>!").
- Header always shows: name, connection dot (green/red), audience points.

## S-04 Contestant sign-in `/contestant`
- Fields: Event code, Seat number (1–8 picker), PIN (4 digits, numeric keypad on mobile).
- Button **Enter**. Errors: "Wrong PIN", "Too many attempts — ask the operator to reset your PIN", "No event found".

## S-05 Contestant view `/contestant/[code]`
Large-type, laptop-first, zero distractions.
1. **Waiting**: "Welcome <name> — seat N". Connection dot. Lobby text.
2. **Shown**: question text, options A–E as big cards (disabled), "Get ready…".
3. **Open**: big countdown bar + seconds, options as big buttons (keys A–E also work from the keyboard). Clicking sends the answer; card shows "Sending…" then "Answer received ✓". Other options become disabled.
   - Individual round, not assigned to me: "<Name> is answering" + question text read-only.
4. **Locked**: "Time is up" + my choice highlighted (or "No answer").
5. **Revealed**: correct option in green, my option red if wrong; "+NN points" with elapsed time ("You answered in 3.4 s"); explanation; **my rank and score**; all contestants' results row list (name, correct/wrong/none, +points).
6. **Leaderboard** (when screen = leaderboard): full contestant leaderboard.
7. **Winner / Raffle / Blank** when `screen` says so (blank = dark neutral screen).
- Header: name, seat, score, rank, connection status. Never shows other contestants' choices before reveal.

## S-06 Operator login `/host/login`
- Email, password, **Sign in**. Error: "Wrong email or password". Redirects to `/host`.

## S-07 Events `/host`
- List of events (name, join code, status, created date). **New event** (name field → creates, opens it).
- Each row: **Open**, **Rename**, **Delete** (type event name to confirm). **Sign out** in header.

## S-08 Event overview `/host/[eventId]`
- Giant join code card ("Audience & contestants join with this code") + copy button.
- Status stepper: Setup → Predictions open → Predictions locked → Live → Finished, with the one valid next button
  ("Open predictions", "Lock predictions", "Start contest", "Finish contest") and allowed back-steps with confirmation.
- **Ready check** panel (FR-023/024) listing each issue with a link to fix it; green when OK.
- Cards: Contestants (n/8, n claimed), Rounds (n, questions n), Audience (n/cap).
- Audience list (live, scrollable, name + joined time) with a **Remove** button per member.
- Prediction counts per contestant (live bars) when predictions exist.
- Navigation tabs: Overview · Contestants · Rounds · Live console · Results.

## S-09 Contestants `/host/[eventId]/contestants`
- Table: seat, photo, name, group, claimed ✓/—, connected ●/○, actions (Edit, Reset PIN, Remove).
- **Add contestant** form (name, group, seat, 4-digit PIN, optional photo). PIN is shown ONCE in a confirmation box with a copy button.
- Disabled editing while event is `live` (except Reset PIN).

## S-10 Rounds & questions `/host/[eventId]/rounds`
- Left: rounds list (drag handles or Up/Down buttons to reorder), **Add round**.
- Round editor: title, type, max/min points, time limit, wrong penalty, first-correct bonus, audience can answer.
- Right: questions of the selected round, each row: number, text preview, correct key, scripture, assigned contestant (individual), status icon (valid / has problem). Up/Down reorder, Edit, Delete.
- Question editor (modal or side panel): text, options A–E (add/remove, min 2), correct option radio, scripture ref, explanation, answer mode, assigned contestant (required if individual), points override (optional), image upload.
- **Import CSV** button: file picker → preview table with per-row ✓/✗ and error messages → **Import valid rows** → summary; link to download template and to download rejected rows.
- Editing is blocked for a question that is currently `open`/`locked`.

## S-11 Live console `/host/[eventId]/live`  (the operator's main screen)
Three-column layout (≥1280 px), nothing scrolls on a 1366×768 laptop for the primary controls.
- **Top bar**: event name, status chip, connection status (green "Live" / red "Reconnecting…"), contestants connected n/N, audience n.
- **Left column — Run order**: rounds and questions list with status markers (not shown / done / current). Click a question to select it (does not show it yet). Round title headers show round type.
- **Center column — Stage controls**:
  - Current question card: round name, question number, text, options with the correct one marked (operator only), scripture ref.
  - Status chip (hidden / shown / open / locked / revealed) and a countdown when open.
  - Big step buttons: **Show** → **Open** → **Lock** → **Reveal** (only the valid next one is enabled and highlighted; Space triggers it). Secondary: **Reset question** (confirm).
  - Spoken mode: two buttons per contestant: **Correct** / **Wrong** (current state highlighted).
  - Projector controls: **Lobby · Predictions · Question · Leaderboard · Winner · Raffle · Blank** (current highlighted).
- **Right column — Contestants**: one card per contestant: name, seat, connected dot, answer state (— / answered ✓ / chosen key / elapsed ms after lock), points after reveal, total score.
- **Bottom or right-bottom — Contestant view mirror**: a small live preview of what contestants currently see (question + status). **Audience** mini-panel: joined count, number who have answered.
- Footer actions: **Next question** (selects the next unplayed question), **Finish round**.
- When status is `open`, the whole center shows the countdown prominently.

## S-12 Results `/host/[eventId]/results`
- Final contestant leaderboard with tie-break columns (points, correct, total correct time).
- Score adjustments: form (contestant, ± points, reason required) + log table.
- Winner button (shows Winner on projector). Audience leaderboard (top 10).
- Raffle: **Draw winner** button, history list of draws (name, pool kind, pool size, time). Draw result also appears on projector.
- Export: **Download results CSV** (contestant leaderboard + per-question results).

## S-13 Projector `/screen/[eventId]`
Dark navy full-bleed, very large type, no scrollbars, no buttons except a small fullscreen icon (bottom-right, appears on mouse move).
Modes (follows `game_state.screen`):
- **lobby**: event name, big join code, "Join the competition", audience joined count.
- **predictions**: "Who will win?" with each contestant (photo, name) and live prediction counts or percentages.
- **question**: round title, question text (≥56 px), options as large lettered cards, countdown ring when open, "Get ready" when shown, status "Time is up" when locked. Individual round: shows "<Name>" chip for whom it is.
- **answer**: correct option highlighted, scripture reference, explanation, and a row per contestant with ✓/✗, points, time.
- **leaderboard**: contestants ranked with animated bars (CSS only) and points; rank change arrows are NOT required.
- **winner**: champion name large with photo, final score, second and third listed.
- **raffle**: "Raffle winner" and the audience member's name large.
- **blank**: plain navy with the small wordmark.
- Updates in place with a 300 ms fade only. Shows a small "Reconnecting…" badge in a corner when offline — never an error page.

## S-14 Global error and 404
- Friendly page with a **Go home** button. Network-offline banner across the top of every page when `navigator.onLine` is false.
