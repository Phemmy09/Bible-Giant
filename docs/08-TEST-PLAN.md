# 08 — Test Plan and Rehearsal

"Done" means these ran and passed. The builder must paste results into `docs/PROGRESS.md`.

## 1. Commands
```
npm run typecheck     # tsc --noEmit
npm run lint
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright (needs a Supabase test project; see README)
npm run build
```

## 2. Unit tests (Vitest)
- U-01 `pointsFor(elapsedMs, 100, 40, 20)` returns 100, 94, 88, 70, 55, 40 for 0, 2000, 4000, 10000, 15000, 20000 ms; clamps above 20000 to 40.
- U-02 `pointsFor` with other settings (M=50, m=10, T=10) at 5000 ms → 30.
- U-03 rank sorting: points, then correct_count, then correct_ms, then seat; "=" rank for equal first three keys.
- U-04 CSV validation: missing correct, bad letter, gap in options (c missing but d present), individual without assigned_seat, unknown round_type — each yields the right error message and row number.
- U-05 error-code → message mapping covers every code listed in doc 02 §10.
- U-06 join code generator never produces 0, O, 1, I, L.

## 3. End-to-end (Playwright) — `tests/e2e/full-flow.spec.ts`
Uses 1 operator context, 3 contestant contexts, 2 audience contexts (mobile viewport).
1. Operator logs in, creates event, reads join code. (AC-01)
2. Adds 3 contestants (seats 1–3, PINs). Each contestant context signs in. (AC-02)
3. Creates round 1 (`speed`, 100/40/20) and imports a 3-question CSV (one question has `correct=B`). (AC-03)
4. Two audience contexts join; operator list shows both within 3 s. (AC-04)
5. Operator opens predictions; audience picks; one changes pick; operator locks; counts match. (AC-05)
6. Operator starts contest. Show Q1 → all 3 contestants + audience see text within 3 s, buttons disabled. (AC-06)
7. Open Q1. Contestant 1 answers B after ~2 s, contestant 2 answers B after ~8 s, contestant 3 answers A. Second click by contestant 1 returns `already_answered`. (AC-08)
8. Lock, Reveal. Assert in DB and on screens: C1 points > C2 points > 0, C3 = 0, and values equal `pointsFor` for the measured `elapsed_ms`. (AC-07, AC-09)
9. Refresh each context at statuses `shown`, `open`, `locked`, `revealed`; assert the correct view returns. (AC-13)
10. Contestant 3 goes offline during `open`, returns online, answers while time remains → accepted. After time limit → `late`. (AC-14, SEC-06)
11. Round 2 `individual` spoken: question assigned to seat 2. Contestant 1 cannot answer; operator marks Correct for seat 2; scores update. (AC-10)
12. Leaderboard order and a forced tie follow the tie-break. (AC-11)
13. Projector context (`/screen/[eventId]`) shows each mode when operator switches modes. (AC-12)
14. Operator finishes event, shows Winner, draws raffle twice; second winner differs from first. (AC-15)
15. Network capture on contestant context before reveal contains no `correct_key` / explanation text. (AC-16, SEC-01)

## 4. Security tests (SEC-01…SEC-12 in doc 03) — `tests/e2e/security.spec.ts`
Implemented with supabase-js clients signed in as: operator, contestant (anonymous + joined), audience, and an unjoined anonymous user. Each test asserts the exact expected error or empty result.

## 5. Load test (Phase 8) — `scripts/load-test.ts`
Spawns 8 contestant sessions and 120 audience sessions (headless supabase-js clients), runs 5 questions end-to-end, and reports: max time from `Open` to all clients seeing it, number of rejected answers, number of dropped subscriptions. Pass: 95% of clients see state changes within 3 s; zero errors other than expected `already_answered`/`late` probes.

## 6. Manual rehearsal checklist (owner signs off) — at the REAL venue/network if possible
- [ ] 6 contestant laptops sign in with seat + PIN.
- [ ] 30+ phones join as audience with the code.
- [ ] Projector shows lobby, predictions, question, answer, leaderboard, winner, raffle, blank.
- [ ] Full 8-round mock event completes (include one individual round and one spoken question).
- [ ] Pull a laptop's network cable / turn off its Wi-Fi mid-question, restore it: it recovers by itself.
- [ ] Refresh the operator console mid-question: nothing breaks.
- [ ] Browser zoom at 100% on the projector looks right at the venue resolution.
- [ ] Printed backup of all questions and answers is in the operator's hand.
- [ ] Operator knows the emergency steps: Reset question, score adjustment, switching projector to Blank.

## 7. Day-of runbook (put in README)
1. 2 days before: open Supabase dashboard (project active). 1 day before: full rehearsal. Morning: hard-refresh all devices.
2. Use one dedicated Wi-Fi router for contestants + operator + projector if possible; audience may use mobile data.
3. Sign in the operator on the projector laptop in a separate window → `/screen/[eventId]` fullscreen.
4. If a contestant's laptop fails: they sign in on another laptop with seat + PIN.
5. If the internet fails completely: stop, continue manually from the printed questions using score adjustments afterwards.
