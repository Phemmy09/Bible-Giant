# Bible Giants — how to use this spec pack

## Put the files in your project
```
your-project/
  CLAUDE.md                 <- stays in the project ROOT (Claude Code reads it automatically)
  docs/                     <- 01-PRD.md ... 08-TEST-PLAN.md
  supabase/schema.sql
```

## First message to Claude Code (copy exactly)
> Read CLAUDE.md and every file in docs/ completely, then supabase/schema.sql. Do NOT write any app code yet.
> Do Phase 0 from docs/07-BUILD-PLAN.md only: audit the existing code in this repo, write docs/AUDIT.md
> (KEEP / ADAPT / REPLACE for each file), create docs/PROGRESS.md and docs/OPEN_QUESTIONS.md, then stop and
> report. If anything in the docs is contradictory or missing, list it in OPEN_QUESTIONS.md instead of guessing.

## For every next phase
> Proceed to Phase N. Follow CLAUDE.md section 5. Show me the commands you ran and the test output.

## Your own setup (do once, before Phase 1)
1. Supabase: new project -> Authentication -> Providers -> enable **Anonymous sign-ins**.
2. Authentication -> Users -> add the operator (email + password).
3. SQL Editor -> paste and run `supabase/schema.sql` once (fresh project only).
4. Keep your Supabase URL + anon key for `.env.local` and Vercel.

## Things only you can supply
- Church logo files in `public/brand/` (get leadership permission first).
- The real question bank (use the CSV format in docs/03).

## What was already checked
`schema.sql` was run on a clean PostgreSQL 16 with stand-in Supabase pieces (auth, roles, storage) and
exercised end to end: PIN join and lockout, speed scoring, duplicate and late answers, hidden answer key,
individual rounds, spoken marking, reset, score adjustment, raffle. One bug was found and fixed
(individual rounds could not have max points below the default minimum). The real Supabase Realtime and
the Next.js app itself are NOT tested yet -- that is what the build phases prove.

## Phase A (operator dashboard, imports, live sync)
Read `docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md`. Use `AGENTS.md` (copy of CLAUDE.md) if you build with Antigravity.
Paste this to your AI builder:
> Read CLAUDE.md (or AGENTS.md) and docs/09-PHASE-A-OPERATOR-AND-LIVE-SYNC.md completely, then the rest of docs/. Do Gate A1 only
> (the database migration in section 7). Keep the existing look and feel. Stop after A1 and show me the test output.
