# Bible Giants — Ondo & Ekiti Camp Meeting

> *"Thy word have I hid in mine heart, that I might not sin against thee."* — Psalm 119:11  
> **The Apostolic Faith Church • Ondo & Ekiti Region**

Bible Giants is a live Bible quiz web application engineered specifically for the Apostolic Faith Camp Meeting. Built with Next.js 14 App Router, TypeScript (strict mode), and Supabase PostgreSQL with Row Level Security (RLS) and Realtime Presence.

---

## 🏛 Application Surfaces & Architecture

The application is structured into four primary surfaces:

| Surface | Route | Description |
|---|---|---|
| **Landing** | `/` | Wordmark, camp meeting subtitle, direct entry for Contestants, Audience, and Operator. |
| **Audience Join** | `/audience` | 5-character event code and display name entry with auto-join redirection. |
| **Audience Live View** | `/audience/[code]` | Dynamic mobile companion view: Lobby, Predictions, Live Question with countdown ring and tap cards, "Watch & Pray Along" notice for individual rounds, Question Results with explanation, Mini Audience Leaderboard, and Raffle celebrations. |
| **Contestant Sign-in** | `/contestant` | Event code, 1–8 seat picker, and 4-digit PIN authentication. |
| **Contestant Live Podium** | `/contestant/[code]` | Laptop-first podium view: Personalized greeting, Connection dot, Live Question view (speed/choice/spoken), countdown bar, single-answer enforcement, keyboard shortcuts (A–E), individual assigned indicators, tie-break rank display (`=N`), and full leaderboard. |
| **Operator Login** | `/host/login` | Secure email/password authentication for quizmasters and operators. |
| **Operator Events** | `/host` | Event management dashboard: Create Event, Rename, Delete (with name confirmation). |
| **Event Overview** | `/host/[eventId]` | Event status stepper (Setup → Predictions Open → Predictions Locked → Live → Finished), Giant join code card, Ready Check panel (`FR-023`/`FR-024`), live scrollable audience roster with Remove button, and prediction distribution bars. |
| **Contestants Hub** | `/host/[eventId]/contestants` | 8-seat contestant management: seat picker, names, church group/zone labels, single-view PIN confirmation modal, Reset PIN modal, and photo uploads. |
| **Rounds & Questions** | `/host/[eventId]/rounds` | 2-column round and question management, Up/Down reordering, question editor (options A–E, correct key selector, scripture reference, explanation, points override, spoken/choice mode, assigned contestant selector), CSV Importer with instant error reporting and rejected row downloads. |
| **Operator Live Console** | `/host/[eventId]/live` | 3-column operator cockpit: Run order, stage progression stepper (**Show → Open → Lock → Reveal → Reset**), Spacebar advances step, shortcut keys (`L` for Leaderboard, `B` for Blank, `Q` for Question), auto-lock timer, spoken grading (`✓ Correct` / `✗ Wrong`), real-time podium answer monitor, and Score Adjustments modal. |
| **Results & Awards** | `/host/[eventId]/results` | Final contestant leaderboard with 4-tier deterministic tie-break columns, top 10 audience standings, raffle drawing engine (`rpcHostDrawRaffle`), score adjustments audit log, and PapaParse CSV Results export. |
| **Projector Display** | `/screen/[eventId]` | Full-bleed dark navy (`navy-950`) auditorium display optimized for 1080p and 4K projectors with ultra-large typography (≥56px), zero scrollbars, and modes: `lobby`, `predictions`, `question`, `answer`, `leaderboard`, `winner`, `raffle`, and `blank`. |
| **Error / 404 Pages** | `/_not-found`, `/error` | Custom church-branded error boundaries and 404 pages with return links. |

---

## 🛠 Tech Stack & Strict Constraints

Per `CLAUDE.md` and `docs/02-ARCHITECTURE.md` §3, the codebase adheres to strict dependency constraints:
- **Framework**: Next.js 14.2.35 (App Router, React 18, `@supabase/ssr`, `@supabase/supabase-js`).
- **Styling**: Tailwind CSS with locked design tokens (`navy-950`, `navy-900`, `gold-500`, `gold-300`, `cream-50`, `cream-100`, `ink-900`, `ink-500`, `success`, `danger`).
- **Fonts**: Self-hosted `Cormorant_Garamond` (display titles) + `Inter` (body and UI) via `next/font/google`.
- **Parsing**: `papaparse` for question CSV import and results export; `zod` for schema validation.
- **Testing**: `vitest` for unit tests; `@playwright/test` for e2e rehearsals.
- **Forbidden Dependencies**: Zero third-party UI component libraries (no Radix, no MUI, no Shadcn), zero external state managers (no Zustand, no Redux), zero animation libraries (no Framer Motion), zero sound engines.
- **Scoring Architecture**: Scoring formulas execute strictly on PostgreSQL server time (`clock_timestamp()`).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+
- A Supabase project (or local Supabase CLI)

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. Database Setup
Run the canonical database migration script located in `supabase/schema.sql` inside your Supabase SQL Editor. This sets up all 14 tables, row-level security (RLS) policies, and 19 typed security-definer RPCs.

### 4. Install & Run
```bash
# Install dependencies
npm install

# Run TypeScript verification
npm run typecheck

# Run linter
npm run lint

# Run unit tests
npm run test

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📋 Day-of Venue Runbook (docs/08-TEST-PLAN.md §6 & §7)

### 1. Timeline & Checklist
- **2 Days Before**: Log in to Supabase dashboard; verify project is active and not paused. Confirm database connection pooler.
- **1 Day Before**: Complete full mock rehearsal at venue with projector and podium laptops.
  - [ ] 8 contestant laptops connect to Wi-Fi and sign in with seat numbers and PINs.
  - [ ] 30+ mobile devices join as audience via join code.
  - [ ] Projector displays `lobby`, `predictions`, `question`, `answer`, `leaderboard`, `winner`, `raffle`, and `blank`.
  - [ ] Run through at least one individual round and one spoken question.
  - [ ] Pull network cable or turn off Wi-Fi on a contestant laptop mid-question; verify it automatically reconnects and restores state.
  - [ ] Hard refresh the operator console mid-question; verify it restores active question and answers.
  - [ ] Confirm browser zoom is set to 100% on projector laptop; test auditorium visibility from the rear row.
- **Morning of the Event**:
  - [ ] Hard-refresh all 8 contestant podium laptops (`Ctrl + F5`).
  - [ ] Verify printed paper backup of all questions, answers, and scripture references is physically in the operator's hands.
  - [ ] Sign in operator on the projector laptop in a dedicated window: navigate to `/screen/[eventId]` and toggle Fullscreen mode.

### 2. Network Topology
- Use one dedicated, isolated Wi-Fi router for the 8 contestant laptops, operator laptop, and projector display.
- Audience members should connect via venue guest Wi-Fi or their own cellular mobile data to avoid saturating the contestant network.

### 3. Contingency & Emergency Procedures
1. **Contestant Laptop Fails**:
   - Have a spare laptop pre-configured. The contestant simply navigates to `/contestant`, selects their seat number, and re-enters their 4-digit PIN. The system reclaims their podium session immediately.
2. **Question Reset Needed**:
   - If a question was triggered prematurely or has a disputed dispute, the operator clicks **"Reset Question"** in the Live Console. This deletes all answers recorded for that question, returns the state to `shown`, and recomputes all scores immediately.
3. **Manual Score Correction**:
   - The operator can click **"Adjust Scores"** in the Live Console header at any time, select the contestant, enter `+` or `-` points, provide a mandatory reason, and commit. Scores recalculate atomically across all screens.
4. **Projector Blanking**:
   - Press `B` on the operator keyboard (or click **Blank**) to instantly switch the auditorium screen to a dark neutral church watermark during pauses or stage prayers. Press `Q` to switch back to the question.
5. **Total Internet Failure**:
   - Stop the digital quiz. Continue the competition manually using the printed paper backup questions and manual timers. When internet connectivity is restored later, use the **Score Adjustments** panel to credit points to the digital leaderboard for final results export and certificate generation.
