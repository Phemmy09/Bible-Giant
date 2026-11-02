# 09 — Phase A: Operator Dashboard, Question Import, and Live Sync

Version 1.0 · Status: LOCKED SCOPE · This document is an ADDENDUM to docs 01–08.
Where it conflicts with docs 01–08, THIS document wins (see §2 for the exact list). Everything not
mentioned here stays as written in docs 01–08.

The owner already has a partly built app and LIKES its current look and feel. Keep the existing
visual style. Do not redesign. Adapt, do not replace, whatever already works (CLAUDE.md §2).

---

## 1. Goal of this phase
Make these things work, completely and reliably, before anything else is built:

1. **Operator dashboard** is the single control centre: codes, links, people, questions, rounds, live control, results.
2. **Questions** can be added by typing, or imported from CSV, Word (.docx) and PDF, into any chosen round.
3. **Live sync**: whatever the operator does appears on the projector, every contestant laptop and every audience phone at the same moment, automatically, with no refresh.
4. **Speed-based scoring** for contestants AND audience, results shown after the operator reveals.
5. **Round summaries**: after each round, all contestant points and the audience top 5.
6. **Audience details are recorded** so every audience score belongs to a known person.
7. Rounds 1–3 include the audience. Rounds 4–5 are contestants only (configured per round; their special formats are NOT part of this phase).

Out of scope for this phase: the special formats of rounds 4 and 5, QR codes, automatic reveal, sound, any new round type.

---

## 2. Amendments to earlier documents (this document wins)
| Earlier document | Said | Now |
|---|---|---|
| 01-PRD FR-022, 03 §6 | Questions import from CSV only | CSV, Word `.docx`, and PDF (text-based), plus typed entry |
| 01-PRD FR-030, 05 S-02 | Audience joins with code + name | Code + **name + assembly/church** required, **phone optional** (§6) |
| 01-PRD FR-062, 04 §6, 05 S-03, S-13 | Audience board shows top 10 | **Top 5** everywhere |
| 01-PRD §3 non-goals | — | Still true: no QR, no auto-reveal, no new round types |
| 02 §3 allowed dependencies | zod, papaparse, … | Add exactly: `mammoth` (Word), `pdfjs-dist` (PDF). Nothing else |
| 03 RPC contract | `join_as_audience(code, name)` | `join_as_audience(code, name, assembly, phone)` (§6) |
| 03 enums | `screen_mode` has 8 values | Add `round_summary`, `audience_board` (§8) |
| CLAUDE.md §0 | priority list | Doc 09 sits directly below `CLAUDE.md`, above doc 01 for the topics in this document |

Record each of these in `docs/OPEN_QUESTIONS.md` as "Decided by owner in doc 09" so nobody reopens them.

---

## 3. Operator dashboard (what must be on it)
Route stays `/host/[eventId]` (overview) with the existing tabs: Overview · Contestants · Rounds · Live console · Results.

### 3.1 "Join" panel — always visible at the top of the Overview AND shown small in the Live console header
Shows, in a simple readable block:
- **Event code**, huge (one code serves both contestants and audience), with a **Copy** button.
- **Audience link** `https://<site>/audience?code=ABCDE` with Copy. Opening it pre-fills the code.
- **Contestant link** `https://<site>/contestant?code=ABCDE` with Copy. Opening it pre-fills the code.
- Plain line of instruction text: "Contestants: enter this code, your seat number and your PIN. Audience: enter this code and your name."
- A **Show code on projector** button (sets the projector to `lobby`, which already shows the big code).
- Live counters: contestants signed in n/N · audience joined n/cap · projector connected yes/no.

### 3.2 Overview cards
Keep what S-08 specifies (status stepper, ready check, audience list with Remove, prediction counts). Add to the audience list: assembly and phone columns (§6).

### 3.3 Everything on one screen is NOT required
Setup lives on Contestants and Rounds tabs; running the show lives on the Live console. But **every tab shows the same top bar**: event name, event status, connection status, join code (small, copyable), and the in-sync indicator (§9.4).

---

## 4. Questions: typing, quick-add, moving, importing

### 4.1 Objective by default
New question defaults: answer mode `choice`, **4 options (A–D)**, all text boxes visible, "correct answer" chosen by clicking a letter. The operator may use 2–5 options. `spoken` mode stays available as a switch.

### 4.2 Add to a chosen round
Every place a question is created (typed, quick-add, import) has a **"Add to round"** dropdown listing the event's rounds (with a "+ New round" entry that creates one inline). The last-used round is remembered for the session.

### 4.3 Quick-add mode (fast typing of many questions)
On the Rounds tab, a **Quick add** button opens a compact form: round dropdown, question text, option A–D, correct letter (A–D buttons), scripture reference (optional), explanation (optional).
- `Ctrl+Enter` (or the **Save & add next** button) saves, clears the form, keeps the same round, and puts the cursor back in the question box.
- A running counter shows "N questions added to <round>".
- Validation errors appear next to the field; nothing is saved until valid.

### 4.4 Edit / move / reorder / delete
- Each question row has **Edit**, **Delete**, **Up/Down**, and **Move to round…** (dropdown). Moving appends it to the end of the target round and renumbers both rounds with no gaps.
- A question that already has answers (has been played) cannot be moved or deleted; the UI says why and offers nothing else.
- Editing is blocked for a question currently `open`/`locked` (already in S-10).

### 4.5 Import (CSV, Word, PDF) — one dialog, same three steps for every file type
**Step 1 Choose file and round.** File picker accepts `.csv`, `.docx`, `.pdf`. Dropdown "Add to round". (A CSV may also contain its own `round_position` column; if it does, the column wins per row and the dropdown is the fallback for rows without it.)
**Step 2 Preview and fix.** The file is parsed IN THE BROWSER (no upload to any server). A table shows every detected question: number, text, options, correct answer, scripture, and a ✓ or ✗ with the problem in plain words. Every cell is editable here so the operator can fix mistakes before saving. Rows with problems are highlighted and excluded until fixed. A line shows "N ready, M need attention".
**Step 3 Import.** Button **Import N questions**. All ready rows are saved in ONE database call (§7 `host_import_questions`) — either all N are saved or none are. Then a summary: "N added to <round>". Rejected rows can be downloaded as a CSV.

Never save anything before Step 3. Never silently drop a row.

### 4.6 Word and PDF format (the owner must write documents like this)
The parser is deterministic (no AI, no paid service), so documents must follow this layout. Provide it as a downloadable **template** (`public/question-template.docx` and `.pdf` is not needed; the DOCX template and the on-screen format guide are enough) and show the guide inside the import dialog:

```
1. Who built the ark?
A. Moses
B. Noah
C. Abraham
D. David
Answer: B
Reference: Genesis 6:14
Explanation: God told Noah to build an ark.      (optional)

2. Next question text ...
A. ...
```
Rules the parser follows exactly:
- A question starts with a number followed by `.` or `)` at the start of a line.
- Options start with `A.`, `A)`, `(A)` through `E` (upper or lower case), one per line.
- A line starting `Answer:` / `Ans:` / `Correct:` followed by a letter gives the correct answer.
- Lines starting `Reference:` / `Ref:` / `Scripture:` give the reference; `Explanation:` gives the explanation.
- Text lines between the number line and `A.` belong to the question text; text after an option that is not a new option or label continues that option.
- Blank lines are ignored.
- A question with fewer than 2 options, no answer letter, or an answer letter with no matching option is flagged ✗ in the preview (never guessed).

**Limits to tell the user plainly in the dialog:**
- PDF must contain real selectable text. A scanned PDF (a photo of paper) has no text: show "This PDF looks like a scan and has no readable text. Please use a Word or CSV file, or type the questions."
- If a file yields zero questions: "No questions were found. Check the layout against the guide above."
- Maximum file size 5 MB; maximum 500 questions per import.

### 4.7 CSV
Keep the CSV format in doc 03 §6 unchanged. The preview and single-call import in §4.5 apply to CSV too.

---

## 5. Live sync (the heart of this phase)

### 5.1 One source of truth
`game_state` (one row per event) decides what EVERY screen shows. The operator never "pushes" to screens; the operator calls an RPC that changes `game_state`, and every screen reacts to that row. Contestant laptops, audience phones and the projector all use the same hook `useGameState` (doc 02 §8). Do NOT write separate sync code per screen.

### 5.2 What each operator action must cause (exact)
| Operator does | Projector | Contestant laptop | Audience phone |
|---|---|---|---|
| **Show** | question + options, "Get ready" | question + options, buttons disabled | same, if round allows audience; else "Contestants only — watch and pray along" |
| **Open** | countdown starts | countdown + buttons enabled | same as contestant, if allowed |
| **Lock** (or time ends) | "Time is up" | "Time is up", own choice shown | same |
| **Reveal** | correct answer + per-contestant results + points | correct answer, own points, own rank, all contestants' results | correct answer, "You were right +NN" / "Not this time", own audience rank |
| **Next question** → **Show** | next question replaces everything | same | same |
| **Round summary** (§8) | all contestant points + audience top 5 | contestant standings | contestant standings + own audience rank |
| **Leaderboard / Winner / Raffle / Blank / Lobby / Audience board** | that view | that view | that view |

Nothing in this table may require anyone to refresh.

### 5.3 "Show & Start" convenience
The Live console has a primary button **Show & Start** next to **Show**: it calls `host_show_question` then `host_open_question` back to back (second call only after the first succeeds). Normal Show then Open stays available. Space = next valid step as before. Pressing Show & Start must be disabled while a call is pending (no double fire).

### 5.4 Reliability rules (restating CLAUDE.md §4 for this phase; all mandatory)
- Subscribe, track status, auto-reconnect with backoff, re-fetch full state on every reconnect, 3-second polling while disconnected, re-fetch on tab visible, ignore older `version`.
- Every screen shows a visible connection state (green/red dot + text). A device that is disconnected shows "Reconnecting…" and its answer buttons are disabled.
- A refresh at any moment restores the correct screen within 3 seconds.

### 5.5 Timing numbers (acceptance targets)
Measured from the operator pressing a button to the new content being visible in the DOM, on a normal network, same-machine clocks:
- p50 ≤ 1.0 s · p95 ≤ 2.0 s · max ≤ 3.0 s, for each of: projector, 8 contestant laptops, 120 audience phones.
- Answer click → "Answer received" confirmation: p95 ≤ 1.0 s.
- Operator sees a new answer arrive in the console: p95 ≤ 2.0 s.

### 5.6 If the targets are missed at 120 audience
Postgres-Changes fan-out can slow down with many subscribers. If the load test (§10) misses §5.5, the builder must NOT hack around it silently. Write the measurements in `docs/OPEN_QUESTIONS.md` as "Q-A1" and propose switching the audience to Supabase **Realtime Broadcast sent from the database** for `game_state` changes (contestants/projector stay as they are). The owner decides. Until then, the 3-second polling fallback is the safety net.

### 5.7 Fairness note (do not "fix" in code)
Speed is measured from the SERVER open time to the SERVER receipt time (doc 04 §4). Different internet speeds between devices are not compensated (doc 01 D-04). The rehearsal at the real venue on one router is how fairness is protected. Do not add client-clock logic.

---

## 6. Audience identity ("every audience member must be logged in")

### 6.1 Join form
Fields: **Event code** (pre-filled when the link has `?code=`), **Your name** (1–30, required), **Your assembly / church** (1–60, required), **Phone number** (optional, 7–20 characters of digits, spaces, `+`, `-`).
Plain note under the form: "Your name and assembly are shown to the organisers and your name may appear on the big screen. Phone number is optional."

### 6.2 Storage
`audience_members` gets columns `assembly text not null` and `phone text null`. Existing rows (if any exist from earlier testing) get assembly `'Unknown'` in the migration.

### 6.3 Where it is shown
- Operator audience list: name, assembly, phone, joined time, Remove.
- Operator Results: audience leaderboard with name, assembly, points; **Download audience CSV** (name, assembly, phone, total points, correct count, per-round points).
- Projector and phones show **name and assembly only**, never phone.
- Phone numbers are visible only to the operator account (enforced by RLS: the existing `audience_read` policy limits rows to the owner and the member themself; the app must never select `phone` from any contestant/audience/projector view).

### 6.4 Same person, same identity
Rejoining from the same browser keeps the same identity (existing behaviour). Rejoining with a different name updates name/assembly/phone.

---

## 7. Database changes (migration file)
Create `supabase/migrations/002_phase_a.sql`. It must be safe to run ONCE on the owner's existing Supabase project (not a fresh one). Also update `supabase/schema.sql` so a fresh project ends in the same final state. Do not edit migration 001 (the original schema); treat the current `schema.sql` as 001.

1. `alter table audience_members add column assembly text not null default 'Unknown'`, then drop the default; `add column phone text` with a length check.
2. Replace `join_as_audience` with `join_as_audience(p_code text, p_name text, p_assembly text, p_phone text)`; keep all existing checks (cap, name length) and add assembly length 1–60 (`bad_assembly`) and phone format (`bad_phone`). Drop the old 2-argument function and revoke/grant execute exactly as the original did.
3. `alter type screen_mode add value 'round_summary'` and `add value 'audience_board'`. (Postgres forbids using a new enum value in the same transaction that adds it: run the `add value` statements first, on their own.)
4. `alter table game_state add column summary_round_id uuid references rounds(id) on delete set null`.
5. New RPC `host_show_round_summary(p_event uuid, p_round uuid)`: owner only; sets `screen = 'round_summary'`, `summary_round_id = p_round`, increments `version`. Error `bad_state` if the round is not in the event.
6. New RPC `get_round_summary(p_event uuid, p_round uuid) returns jsonb`: allowed for the owner at any time, and for members ONLY while `game_state.screen = 'round_summary'` and `summary_round_id = p_round` (otherwise raises `closed`). Returns:
   ```
   { round_title,
     contestants: [{contestant_id, name, group_label, round_points, total_points, correct_in_round, rank}],   // all contestants, ranked by total using doc 04 §6
     audience_top5: [{name, assembly, round_points, total_points, rank}],                                    // by TOTAL audience points, tie-break per doc 04 §6; empty when the round does not allow audience
     my_audience: {rank, total_points, round_points} | null }                                                // only when caller is an audience member
   ```
   `round_points` = sum of `answers.points` for questions in that round (adjustments excluded). Never returns phone.
7. New RPC `get_audience_board(p_event uuid) returns jsonb` — overall top 5 audience (name, assembly, total_points, rank) plus `my_audience`; allowed for the owner always and for members only while `game_state.screen = 'audience_board'`.
8. New RPC `host_import_questions(p_event uuid, p_round uuid, p_questions jsonb) returns int`: owner only; inserts every item in ONE transaction at the end of the round (positions continue after the current maximum), creating each question and its `question_keys` row. Each item: `{body, options:[{key,text}], correct_key, scripture_ref, explanation, answer_mode, assigned_contestant_id}`. Validate each item with the same rules as the table constraints plus: correct key exists among option keys (when `choice`), keys unique and A–E without gaps. Any invalid item raises `bad_question` with the item number in the message and NOTHING is saved. Maximum 500 items. Returns the number inserted.
9. New RPC `host_move_question(p_event uuid, p_question uuid, p_round uuid)`: owner only; refuses (`already_played`) if the question has answers or is the current question; appends to target round; renumbers positions in both rounds with no gaps (use a temporary offset because of the `unique (round_id, position)` constraint).
10. Grants: add every new function to the `grant execute … to authenticated` list and keep `recompute_scores`, `assert_event_owner`, `gen_join_code` ungranted.
11. Update `docs/03-DATA-AND-SECURITY.md` §3 RPC table with the new and changed RPCs, and `docs/05-SCREENS.md` with the screen changes in §3, §4, §6, §8.
12. After writing the migration, the builder MUST run it twice in the test harness: (a) on a database built from the old schema (upgrade path) and (b) on a fresh database built from the new `schema.sql`, and show that both end identical (compare `\d` output or a schema diff).

---

## 8. Round summary and audience board screens

### 8.1 Operator controls (Live console, projector controls row)
Add **Round summary** (uses the round of the current question; if none, a dropdown asks which round) and **Audience top 5** buttons. Results tab also has them.

### 8.2 Projector `round_summary`
Title "<Round title> — results". Left: all contestants ranked, showing name, points this round, total points (large bars as in S-13 leaderboard). Right: "Audience top 5" — name, assembly, total points. If the round does not allow the audience: right side shows "This round was for contestants only" instead.

### 8.3 Contestant laptop and audience phone `round_summary`
- Contestant: the contestant standings list with own row highlighted.
- Audience: the same list, plus "Audience top 5" and a line "You are #R of N audience members — NN points".

### 8.4 `audience_board`
Overall audience top 5 on the projector (name, assembly, points); phones show the same with the user's own rank.

---

## 9. Operator dashboard behaviour details

### 9.1 Per-round audience switch
Round editor has the toggle **"Audience can play this round"** (exists as `audience_can_answer`). Default ON when creating a round. Rounds the owner calls 4 and 5 are simply set OFF by the owner. The system must enforce it on the server (`submit_answer` already returns `closed` for audience when OFF — keep that) and the audience UI must show "Contestants only" (§5.2).

### 9.2 Review before reveal
Reveal stays operator-controlled. After **Lock**, the console shows, per contestant, who answered, which option, and elapsed seconds, and for the audience the count per option (bar chart: A/B/C/D) — computed from `answers` which the owner can already read. The operator presses **Reveal** when ready. (Auto-reveal is NOT built; see §12.)

### 9.3 Question navigation
**Next question** selects the next unplayed question in run order (crossing into the next round if needed) and highlights it; it does not show it until Show / Show & Start is pressed. If the next question belongs to a new round, a one-line banner says "New round: <title>" and offers **Round summary** for the finished round first.

### 9.4 In-sync indicator
Contestants and the projector report their last applied `game_state.version` through the existing Presence channel `presence:<eventId>` (payload `{role, id, version}`, updated whenever `version` changes). The host top bar shows **"In sync n/N"** (devices whose version equals the current one) and a click opens a list of devices that are behind or disconnected (name or "Projector", seconds behind). Audience devices are NOT put on Presence (too heavy at 120); audience is counted from `audience_members`, and audience sync is verified by the load test (§10), not by this indicator.

---

## 10. Tests that prove it works (all MUST be run and their output pasted into `docs/PROGRESS.md`)

### 10.1 Database
- DB-A01 Migration upgrade path and fresh path produce identical schemas (§7.12).
- DB-A02 `join_as_audience` rejects missing assembly (`bad_assembly`) and bad phone (`bad_phone`); accepts blank phone.
- DB-A03 `host_import_questions` with 3 valid items saves 3 with continuing positions; with 1 invalid item among 50 saves 0 and returns `bad_question` naming the item number.
- DB-A04 `host_move_question` moves, renumbers both rounds with no gaps; refuses a played question (`already_played`).
- DB-A05 `get_round_summary` returns data to a contestant only when `screen = 'round_summary'` for that round; otherwise `closed`; never contains `phone`; `audience_top5` has at most 5 rows and is empty for a round with audience OFF.
- DB-A06 A contestant and an audience member cannot select `audience_members.phone` of others (RLS), and the owner can.

### 10.2 Parsers (unit tests, Vitest)
- U-A01 DOCX parser: a fixture with 5 questions in the §4.6 layout yields 5 correct questions.
- U-A02 PDF parser: a text PDF fixture with the same content yields the same 5.
- U-A03 Scanned/empty PDF fixture → the "looks like a scan" message, zero questions.
- U-A04 Bad fixtures: question with 1 option, answer letter `E` with only 4 options, missing `Answer:` — each flagged ✗ with the right message and NOT imported.
- U-A05 CSV fixture with 2 deliberate errors reports exactly those 2 rows.
- U-A06 Round-trip: parse → preview edit → import results in exactly the edited text in the database.
Fixtures live in `tests/fixtures/` and the owner can replace them with a real sample later.

### 10.3 End-to-end sync (Playwright, `tests/e2e/phase-a-sync.spec.ts`)
Contexts: 1 operator, 1 projector, 3 contestants, 3 audience (mobile viewport). For each step, record timestamps and assert the §5.5 numbers.
1. Operator opens Overview and reads the code; the contestant and audience links pre-fill the code (AC-A01).
2. Operator imports a DOCX of 5 questions into Round 1 and types 2 more with Quick add into Round 2 (AC-A02, AC-A03).
3. Audience joins with name + assembly (+ phone for one); operator list shows all three with assembly (AC-A04).
4. Show & Start Q1: projector, 3 contestants, 3 audience all show the question and a running countdown (AC-A05).
5. Contestants answer at different times; audience answer; operator sees all answers arrive and the A/B/C/D audience counts (AC-A06).
6. Lock → Reveal: all screens show the correct answer; points ordered by speed for correct answers; wrong = 0 (AC-A07).
7. Next question → Show: every screen switches without refresh (AC-A08).
8. After Q5: Round summary: projector shows all contestants and audience top 5; contestants and audience see theirs (AC-A09).
9. Round with audience OFF: audience phones show "Contestants only" and cannot answer (server also rejects) (AC-A10).
10. Kill the network of one contestant context mid-question, restore: it recovers by itself and can still answer if time remains (AC-A11).
11. Refresh each context at shown / open / locked / revealed / round_summary: the same view returns (AC-A12).
12. In-sync indicator reads 4/4 (3 contestants + projector) after each change and shows a lagging device when one is throttled (AC-A13).

### 10.4 Load test (script `scripts/load-sync-test.ts`)
8 contestant sessions + 120 audience sessions + 1 operator (headless supabase-js). Run 10 consecutive questions (Show & Start → all answer within 5 s at random → Lock → Reveal). Report p50/p95/max of: operator action → each client receiving the new `game_state`; answer submit → confirmation; plus count of dropped subscriptions and failed RPCs. **Pass = §5.5 numbers.** Paste the table into `docs/PROGRESS.md`. If it fails → §5.6.

### 10.5 Manual rehearsal additions (owner signs off, append to doc 08 §6)
- [ ] Import a REAL question document the church uses (Word and PDF versions) and fix whatever the preview flags.
- [ ] Run Rounds 1–3 with real contestants and at least 30 audience phones on the venue router.
- [ ] Watch the projector, one contestant laptop and one phone side by side while the operator clicks: they change together.

---

## 11. Acceptance criteria for Phase A (all must pass)
- AC-A01 Join code, audience link and contestant link are on the operator dashboard, copyable; links pre-fill the code.
- AC-A02 Questions can be typed (full form and Quick add) into any chosen round, 4-option objective by default.
- AC-A03 Questions can be imported from CSV, DOCX and text PDF into a chosen round with preview, editing, and atomic save; scanned PDFs get a clear message.
- AC-A04 Audience join records name + assembly (+ optional phone); the operator sees all three; phone is never shown on any public screen.
- AC-A05 Show / Show & Start puts the question on projector, contestants and audience at the same time with no refresh.
- AC-A06 Contestants and (where allowed) audience answer; operator sees answers live.
- AC-A07 Reveal shows results and speed-ordered points on all screens.
- AC-A08 Changing to the next question updates every screen automatically.
- AC-A09 Round summary shows all contestant points and audience top 5 on projector and devices.
- AC-A10 Rounds with audience OFF block audience answers in the UI and on the server.
- AC-A11 Reconnect works mid-question.
- AC-A12 Refresh restores the right view at every status.
- AC-A13 In-sync indicator works for contestants and projector.
- AC-A14 Load test meets §5.5 with 8 contestants + 120 audience, or the owner has made the §5.6 decision.
- AC-A15 All earlier SEC-* tests (doc 03) still pass after the migration.
- AC-A16 The existing look and feel is preserved (owner reviews screenshots of before/after for the Landing, Contestant, Audience and Projector screens).

---

## 12. Decisions left open for the owner (builder: do not decide these)
- Q-A2 **Auto-reveal** when every contestant has answered: not built; reveal stays manual. Ask the owner later if wanted.
- Q-A3 **Rounds 4 and 5** formats: not built; only the audience ON/OFF switch exists.
- Q-A4 Whether the audience top 5 should also be shown after every single question: not built.
- Q-A5 QR code for joining: not built.

---

## 13. Build order for this phase (stop at each gate; report in `docs/PROGRESS.md`)
**A1 Migration** — §7 complete, DB-A01…A06 pass, SEC-* still pass.
**A2 Audience identity** — §6 join form, operator audience list, CSV download.
**A3 Operator dashboard shell** — §3 join panel, top bar on every tab, links pre-fill.
**A4 Questions** — §4.1–4.4 typing, Quick add, move, reorder.
**A5 Import** — §4.5–4.7 parsers + preview + atomic import; U-A01…A06 pass.
**A6 Live sync review** — audit every screen against §5.2; fix gaps; §5.3 Show & Start; §9.2 review panel; §9.3 navigation; §9.4 in-sync indicator.
**A7 Round summary + audience board** — §8.
**A8 Proof** — §10.3 e2e and §10.4 load test pass; owner rehearsal §10.5.

Never begin the next gate until the owner says "Proceed to A<n>".
