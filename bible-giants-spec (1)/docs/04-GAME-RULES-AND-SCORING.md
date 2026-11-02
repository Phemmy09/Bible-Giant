# 04 — Game Rules, State Machines and Scoring (EXACT)

## 1. Question state machine (`game_state.question_status`)
```
hidden ──Show──► shown ──Open──► open ──Lock (or timer)──► locked ──Reveal──► revealed
                   ▲                │                          │
                   └──── Reset ─────┴──────────────────────────┘   (Reset also allowed from revealed)
```
| Status | Contestants/audience see | Can answer? | Timer |
|---|---|---|---|
| `hidden` | "Waiting for the next question" | No | — |
| `shown` | Question text + options | No (buttons disabled, "Get ready") | Not started |
| `open` | Question + options + countdown | Yes (once) | Running |
| `locked` | Question + "Time is up" + own choice | No | Stopped |
| `revealed` | Correct answer, explanation, own points, leaderboard | No | — |

Allowed transitions ONLY (anything else raises `bad_state`):
- `hidden|shown|revealed → shown` via `host_show_question` (event must be `live`; previously current question stays as it is in the DB; `shown → shown` lets the operator swap to a different question before opening)
- `shown → open` via `host_open_question`
- `open → locked` via `host_lock_question`
- `open|locked → revealed` via `host_reveal_question`
- `shown|open|locked|revealed → shown` via `host_reset_question` (answers for the current question deleted; scores recomputed)

Auto-lock: the host console runs a timer; when `closes_at` passes it calls `host_lock_question`.
Safety net: even if the host page is closed, the server REJECTS answers after `closes_at + 700 ms`
(the `late` code), and `host_reveal_question` is allowed from `open`. The status may show `open`
past the deadline but nobody can answer.

## 2. Event status effects
- `host_show_question` requires event status `live`. The "Start contest" button sets `live` (requires predictions locked or never opened; ready check green).
- Contestants cannot answer unless status is `live` and question is `open`.

## 3. Round types
### 3.1 `speed`
All contestants (and audience, if `audience_can_answer`) answer the same question. Points depend on speed (§4).
### 3.2 `individual`
Each question has `assigned_contestant_id`. Only that contestant can answer. Points are fixed (§5).
Audience may answer along if `audience_can_answer` is true — scored by the fixed rule on the separate audience board.

## 4. Speed scoring (choice questions in `speed` rounds)
Round settings: `max_points` (M), `min_points` (m), `time_limit_sec` (T), `wrong_penalty` (P), `first_correct_bonus` (B).
Let `elapsed_ms` = server `clock_timestamp()` at receipt − `game_state.opened_at`. Let `T_ms = T × 1000`.

```
if answer is correct:
    fraction = clamp(elapsed_ms / T_ms, 0, 1)
    points   = round( M − (M − m) × fraction )            -- integer, round half up
if answer is wrong:      points = −P
if no answer:            points = 0
First correct bonus (contestants only, speed rounds): the contestant with the lowest elapsed_ms among
correct answers (tie → earliest submitted_at) gets +B. Audience never gets a bonus.
```
Defaults M=100, m=40, T=20, P=0, B=0.

Worked examples (M=100, m=40, T=20):
| Elapsed | Correct points |
|---|---|
| 0.0 s | 100 |
| 2.0 s | 94 |
| 4.0 s | 88 |
| 10.0 s | 70 |
| 15.0 s | 55 |
| 20.0 s | 40 |
| wrong | 0 |
With B=10 the fastest correct contestant gets +10 on top.

`lib/scoring.ts#pointsFor(elapsedMs, M, m, T)` MUST return exactly the same numbers; a unit test
asserts the table above, and the e2e test asserts the database returns the same.

## 5. Fixed scoring (`individual` rounds, and `spoken` mode)
- Correct: `coalesce(question.points_override, round.max_points)`.
- Wrong: `−P`. Not answered: 0.
- `spoken`: the host presses Correct or Wrong (`host_mark_spoken`). Marks can be changed any time while the question is current (including after reveal); scores recompute.

## 6. Leaderboards
- Contestant rank order: `total_points` desc → `correct_count` desc → `correct_ms` asc (sum of elapsed_ms over correct answers; lower is better) → seat number asc (last resort, deterministic).
- Ties on the first three keys are displayed with the same rank number ("=2").
- `total_points` = sum of answer points + sum of score adjustments.
- Audience board uses the same order without adjustments. The projector shows top 10 audience.
- Scores are written ONLY by `recompute_scores`, called at the end of reveal, spoken marking, reset, and adjustment.

## 7. Winner
`winner` = rank 1 contestant(s). If tied after all keys incl. seat, the operator is shown a notice
"Tie — decide manually" and may use `host_adjust_score` with reason "Tie-break". (Seat order is only a display fallback.)

## 8. Predictions and raffle
- Predictions: one per audience member per event; changeable while `predictions_open`; frozen at `predictions_locked`.
- Raffle pool: audience whose prediction = rank-1 contestant AND not already a raffle winner. If the pool is empty, pool = all audience not already a winner. If still empty → `no_audience`.
- Random pick: `order by random() limit 1`. The draw is stored in `raffle_draws` with `winner_name` snapshot and `pool_kind` (`correct_predictors` or `all_audience`) and `pool_size`.

## 9. Edge cases (each MUST behave as stated)
| Situation | Behavior |
|---|---|
| Contestant double-clicks an option | Second call returns `already_answered`; UI shows the first choice; stored answer unchanged |
| Contestant tries to change answer | Not allowed (D-06). UI hides options after first tap |
| Answer arrives 300 ms after `closes_at` | Accepted (grace 700 ms) — elapsed is capped at the limit for scoring (fraction clamps to 1) |
| Answer arrives 800 ms after `closes_at` | Rejected `late` |
| Contestant refreshes mid-question | Screen restores from `game_state`; if they already answered, shows "Answer received" with their choice; else they may still answer |
| Contestant laptop dies, sign in on another | Seat + PIN re-claims; the old session loses access |
| Host refreshes console mid-question | Console restores exact state and timer from `opened_at/closes_at` |
| Host presses Show on another question during `open` | Not allowed: buttons disabled; must Lock/Reveal or Reset first |
| Host presses Reveal during `open` | Allowed (locks implicitly); late answers can no longer arrive because status leaves `open` |
| Network drops for the host | Console shows red "Reconnecting…"; step buttons disabled until connected |
| Two operator tabs open | Both work; server enforces transitions; second action returns `bad_state` with a clear message |
| Audience member joins mid-question | They see the current question state; may answer if still `open` |
| Audience cap reached | Join shows "This event is full" |
| Round has no questions | Cannot be run; flagged in Ready check |
| Question has no correct key (choice mode) | Reveal raises `no_key`; Ready check flags it beforehand |
| Event finished | No further answers; screens show final standings; raffle available |
| Reset question | All answers for that question deleted; points removed from scores; status `shown` |
| Score adjustment | Logged with reason, timestamp; shown in results page |
