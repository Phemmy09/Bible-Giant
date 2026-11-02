# 03 — Data and Security

The complete executable definition is `supabase/schema.sql`. This document explains it and fixes
the contract. If this document and `schema.sql` ever differ, fix `schema.sql` to match this.

## 1. Tables
| Table | Purpose | Who reads | Who writes |
|---|---|---|---|
| `events` | An event; join code; status | owner, members | owner (update/delete), RPC `host_create_event` |
| `contestants` | Seat, name, group, photo, claimed auth user | owner, members | RPCs (create/claim); owner (edit name/group/photo/seat, delete) |
| `contestant_secrets` | PIN hash + failed attempts | NOBODY (no grants, no policies) | RPCs only |
| `audience_members` | Audience display names | owner, self | RPC `join_as_audience` |
| `rounds` | Round settings | owner, members | owner |
| `questions` | Text, options, assignment | owner; members only for the CURRENT question once shown | owner |
| `question_keys` | Correct key + explanation | owner; members only when current question is `revealed` | owner |
| `game_state` | One row per event: current round/question/status/screen/timing | owner, members | RPCs only |
| `answers` | Answers with elapsed ms and points | owner; self; others' contestant answers only after reveal | RPC `submit_answer`, `host_*` only |
| `predictions` | Audience winner predictions | owner; self | RPC `submit_prediction` |
| `contestant_scores` / `audience_scores` | Totals | owner, members | `recompute_scores` only |
| `score_adjustments` | Manual ± with reason | owner | RPC `host_adjust_score` |
| `raffle_draws` | Raffle results | owner, members | RPC `host_draw_raffle` |

"members" = contestants or audience of that event (identified by `auth.uid()`).

## 2. Enums
- `event_status`: `setup, predictions_open, predictions_locked, live, finished`
- `round_type`: `speed, individual`
- `question_status`: `hidden, shown, open, locked, revealed`
- `screen_mode`: `lobby, predictions, question, answer, leaderboard, winner, raffle, blank`

## 3. RPC contract (all `security definer`, `search_path = public`)
Host RPCs call `assert_event_owner(event)` first (must be the owner AND not anonymous).

| RPC | Caller | Effect | Error codes |
|---|---|---|---|
| `server_time()` → timestamptz | anyone signed in | server clock | — |
| `get_event_by_code(code)` → `{id,name,status}` | anyone signed in | find event for join page | `no_event` |
| `join_as_audience(code, name)` → audience id | audience | create/update member; cap check | `no_event`, `audience_full`, `bad_name` |
| `join_as_contestant(code, seat, pin)` → jsonb `{ok, code?, contestant_id?, event_id?}` | contestant | verify PIN, claim seat for this session. RETURNS (never raises) so failed-attempt counting is not rolled back | codes in result: `no_event`, `bad_pin`, `locked_out`, `not_joined` |
| `submit_prediction(contestant_id)` | audience | upsert while `predictions_open` | `closed`, `not_joined`, `no_event` |
| `submit_answer(question_id, choice)` → jsonb `{accepted, reason?, elapsed_ms?}` | contestant/audience | validate + insert once. RETURNS (never raises) | reasons: `closed`, `late`, `already_answered`, `not_joined`, `not_your_question`, `bad_choice`, `spoken` |
| `host_create_event(name)` → event | host | event + game_state + join code | `bad_name` |
| `host_set_event_status(event, status)` | host | validated event status change (see PRD §5) | `bad_state` |
| `host_create_contestant(event, name, group, seat, pin)` | host | add contestant | `bad_seat`, `seat_taken` |
| `host_reset_contestant_pin(contestant, pin)` | host | new PIN, clears lockout, un-claims | — |
| `host_set_screen(event, screen)` | host | change projector view | — |
| `host_show_question(event, question)` | host | status→`shown`, screen→`question` (event must be `live`; question must have a key if `choice`; cannot show a question that already has answers unless it is the current one) | `bad_state`, `no_key`, `already_played` |
| `host_open_question(event)` | host | status→`open`, set `opened_at`, `closes_at` | `bad_state` |
| `host_lock_question(event)` | host | status→`locked` | `bad_state` |
| `host_reveal_question(event)` | host | grade, score, status→`revealed`, screen→`answer` | `bad_state`, `no_key` |
| `host_reset_question(event)` | host | delete answers, status→`shown` | `bad_state` |
| `host_mark_spoken(event, contestant, correct)` | host | upsert spoken result + points | `bad_state` |
| `host_adjust_score(event, contestant, delta, reason)` | host | log + recompute | `bad_reason` |
| `host_draw_raffle(event)` → jsonb | host | pick winner, screen→`raffle` | `no_audience` |
| `recompute_scores(event)` | internal | rebuild both score tables | — |

Every RPC that changes `game_state` increments `game_state.version` (clients ignore older versions).

## 4. Row Level Security rules (summary — exact policies in schema.sql)
1. RLS is ON for every table.
2. `anon` role has no table privileges. `authenticated` (which includes anonymous-auth sessions) gets only the grants in schema.sql.
3. PIN hashes and failed-attempt counters live in `contestant_secrets`, which has RLS on, no policies and no grants: unreachable by any client.
4. `question_keys` is selectable by members ONLY when `game_state.current_question_id = question_id AND question_status = 'revealed'`.
5. `questions` is selectable by members ONLY when it is the current question AND status ≠ `hidden`.
6. `answers`: no INSERT/UPDATE/DELETE policy for clients. Select: owner all; self own; contestants' answers of the current question visible to members only when `revealed`.
7. `game_state`, scores, predictions, raffle: no client write policies.

## 5. Security tests (must pass — see `08-TEST-PLAN.md`)
SEC-01 contestant cannot select `question_keys` while status is `open`.
SEC-02 contestant cannot select `questions` that are not the current question, nor any question while `hidden`.
SEC-03 anonymous user calling any `host_*` RPC gets `not_owner`.
SEC-04 contestant cannot read another contestant's answer before reveal.
SEC-05 direct `insert/update/delete` into `answers`, `game_state`, scores by a client fails.
SEC-06 `submit_answer` after `closes_at + 700 ms` returns `late`.
SEC-07 second `submit_answer` returns `already_answered` and does not change the stored answer.
SEC-08 contestant cannot answer an individual-round question assigned to someone else.
SEC-09 wrong PIN 10 times locks the seat until the operator resets the PIN.
SEC-10 `contestant_secrets` cannot be selected, and `contestants` has no pin column, for any client.
SEC-11 audience cap is enforced.
SEC-12 `grep -r service_role` over `app/ components/ lib/` returns nothing.

## 6. CSV import format
UTF-8, first row headers, comma separated. One row = one question. Required columns bold.

| Column | Rule |
|---|---|
| **round_position** | integer ≥1 |
| round_title | text; used when the round does not exist yet |
| round_type | `speed` or `individual` (default `speed`) |
| **question** | text, 3–400 chars |
| **option_a**, **option_b** | text |
| option_c, option_d, option_e | text, optional (no gaps: c before d before e) |
| **correct** | `A`–`E` (must reference an existing option) — required when answer_mode is `choice` |
| scripture_ref | text, e.g. `John 3:16` |
| explanation | text |
| assigned_seat | integer seat number; required for questions in `individual` rounds |
| answer_mode | `choice` (default) or `spoken` |

Rules: question order inside a round follows file order. Import is atomic per file: if "Confirm" is pressed
with errors outstanding, only valid rows are imported and the error rows are listed for download. Rows
are never partially applied. Preview MUST be shown before saving. Provide a template file
`public/question-template.csv` with 3 example rows.

## 7. Data retention
Events and all rows stay until the operator deletes the event (cascade). No personal data beyond display names and contestant names is stored.
