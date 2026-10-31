# Existing Codebase Audit (Phase 0)

Date: October 31, 2026
Source Repository: [Phemmy09/afm-bible-giant2](https://github.com/Phemmy09/afm-bible-giant2)
Evaluated against: `CLAUDE.md`, `docs/01-PRD.md` through `docs/08-TEST-PLAN.md`, and `supabase/schema.sql`.

---

## 1. Executive Summary

The imported codebase was built as a client-side React 18 single-page application (SPA) using Vite, Tailwind CSS v3, Zustand for state management, Framer Motion, and Lucide React. It implemented an earlier draft of the game concept featuring a 6-round format with "Zones", "Turn Order Spinners", an "Ultimate Challenge" ladder, client-rendered PDF certificates (`jspdf`/`html2canvas`), and an extensive classical audio/soundboard engine.

In contrast, the locked specification (`CLAUDE.md` and `docs/01-PRD.md` through `docs/08-TEST-PLAN.md`) specifies:
1. **Framework & Architecture**: Next.js App Router with TypeScript strict (`docs/02-ARCHITECTURE.md`), Server Components by default, and strict route definitions.
2. **Dependencies**: Strict whitelist (`docs/02-ARCHITECTURE.md` §3). Prohibits UI kits, client state libraries (no Zustand), animation libraries (no Framer Motion — CSS transitions only), sound engines (PRD §3 non-goals: no audio/video playback; doc 06 §6: "No sound"), and icon libraries (inline SVG only).
3. **Data & Security**: Single canonical schema in `supabase/schema.sql` with server-side RPC execution, strict RLS, no client-side secret exposure, and anonymous auth pairing.
4. **Scoring & State**: Database-driven scoring (`host_reveal_question`), speed formulas, server timestamp calculations, and 5-stage question lifecycle (`hidden -> shown -> open -> locked -> revealed`).

Therefore, all application pages, stores, and game stage components must be **REPLACED** with Next.js App Router routes and components adhering to `docs/05-SCREENS.md`. Certain utilities (CSV parsing concept, color themes, brand assets) will be **ADAPTED** to conform to the design system and Next.js architecture.

---

## 2. File-by-File Disposition

### 2.1 Project Configuration & Root Files

| File | Disposition | Reason / Plan |
|---|---|---|
| `package.json` | **REPLACE** | Outdated Vite + React SPA dependencies (Zustand, Framer Motion, Lucide, jsPDF). Reconfigure with Next.js, React 18/19, TypeScript strict, `@supabase/ssr`, `zod`, `papaparse`, `clsx`, `vitest`, `@playwright/test`, `eslint`. |
| `package-lock.json` | **REPLACE** | Regenerated when installing compliant dependencies. |
| `vite.config.js` | **REPLACE** | Next.js uses `next.config.mjs` / `next.config.js`; Vite configuration is unused. |
| `index.html` | **REPLACE** | Replaced by Next.js App Router root layout `app/layout.tsx`. |
| `postcss.config.js` | **KEEP / ADAPT** | Standard PostCSS configuration for Tailwind CSS and Autoprefixer. |
| `tailwind.config.js` | **ADAPT** | Update color tokens to exact tokens defined in `docs/06-DESIGN-SYSTEM.md` (`navy-950`, `navy-900`, `navy-700`, `gold-500`, `gold-300`, `cream-50`, `cream-100`, `ink-900`, `ink-500`, `success`, `danger`, `warning`). |
| `vercel.json` | **ADAPT** | Remove SPA rewrites; Next.js handles routing natively on Vercel. |
| `.env.example` | **ADAPT** | Update to export `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only per doc 02 §4. |
| `.gitignore` | **ADAPT** | Ensure `.next/`, `node_modules/`, `.env*.local` are properly ignored. |
| `.oxlintrc.json` | **REPLACE** | Project standard is ESLint per `docs/02-ARCHITECTURE.md` §3. |
| `README.md` | **ADAPT** | Update with production deployment guide, operator runbook, and rehearsal procedures per doc 02 §12 and doc 08 §7. |
| `AFC_Bible_Giant_PRD_v2 (1).md` | **KEEP (Archive)** | Historical reference documentation; superseded by `docs/01-PRD.md`. |
| `supabase_schema.sql` (root) | **REPLACE** | Superseded by canonical `supabase/schema.sql` which enforces correct RLS, RPCs, and scoring. |
| Root image files (`*.jpg`, `*.png`, `*.webp`) | **ADAPT** | Archive in `public/afc/` or move approved brand assets to `public/brand/` as permitted by leadership. |

### 2.2 Public Assets (`public/`)

| File | Disposition | Reason / Plan |
|---|---|---|
| `public/favicon.svg` | **KEEP / ADAPT** | Usable as application favicon. |
| `public/icons.svg` | **ADAPT** | Extract allowed SVG icons (check, cross, copy, expand); inline SVG preferred per doc 06 §4. |
| `public/logo.svg` | **ADAPT** | Archive; doc 06 §7 requires plain text wordmark until official leadership permission is granted. |
| `public/sop.html` | **KEEP (Archive)** | Standard operating procedure reference; preserve for documentation. |
| `public/afc/*` | **KEEP (Archive)** | Historical camp meeting photos and logos. Preserved for reference. |
| `public/audio/*` (19 files) | **REPLACE / REMOVE** | Excluded by scope lock. PRD §3 Non-goals: "video/audio playback"; doc 06 §6: "No sound". |

### 2.3 Application Source Code (`src/`)

#### Libraries & Stores (`src/lib/`, `src/stores/`)

| File | Disposition | Reason / Plan |
|---|---|---|
| `src/lib/constants.js` | **REPLACE** | Hardcoded legacy rules (zones, 60s ultimate challenge ladder). Must be replaced by `lib/scoring.ts`, `lib/errors.ts`, and typed schema definitions. |
| `src/lib/supabase.js` | **ADAPT** | Migrate to `lib/supabase/client.ts` and `lib/supabase/server.ts` utilizing `@supabase/ssr` with Next.js cookie handlers. |
| `src/lib/realtimeSync.js` | **ADAPT** | Logic informs `lib/realtime/useGameState.ts` and `lib/realtime/useServerClock.ts` with required 3s polling fallback, reconnect backoff, and version tracking. |
| `src/lib/soundEngine.js` | **REPLACE / REMOVE** | Out of scope. PRD §3 and doc 06 §6 strictly forbid sound/audio playback. |
| `src/stores/authStore.js` | **REPLACE** | Zustand is prohibited (doc 02 §3). Auth state handled via Supabase session and `middleware.ts`. |
| `src/stores/gameStore.js` | **REPLACE** | Prohibited state library and client-side score computation. State lives in PostgreSQL and is accessed via `lib/rpc.ts` and `useGameState.ts`. |

#### Pages (`src/pages/`)

| File | Disposition | Reason / Plan |
|---|---|---|
| `src/pages/HomePage.jsx` | **REPLACE** | Replaced by `app/page.tsx` (S-01 Landing) matching design system and Cormorant Garamond / Inter typography. |
| `src/pages/AudiencePage.jsx` | **REPLACE** | Replaced by `app/audience/page.tsx` (S-02 Join) and `app/audience/[code]/page.tsx` (S-03 Audience View). |
| `src/pages/TeamClientPage.jsx` | **REPLACE** | Replaced by `app/contestant/page.tsx` (S-04 Sign-in) and `app/contestant/[code]/page.tsx` (S-05 Contestant View). |
| `src/pages/StagePage.jsx` | **REPLACE** | Replaced by `app/screen/[eventId]/page.tsx` (S-13 Projector Screen). |
| `src/pages/AdminLoginPage.jsx` | **REPLACE** | Replaced by `app/host/login/page.tsx` (S-06 Operator Login). |
| `src/pages/AdminDashboardPage.jsx` | **REPLACE** | Replaced by `app/host/page.tsx` (S-07 Events List) and `app/host/[eventId]/page.tsx` (S-08 Overview). |
| `src/pages/admin/LiveControllerPage.jsx` | **REPLACE** | Replaced by `app/host/[eventId]/live/page.tsx` (S-11 Live Console) with exact 3-column layout and RPC controls. |
| `src/pages/admin/QuestionBankPage.jsx` | **REPLACE** | Replaced by `app/host/[eventId]/rounds/page.tsx` (S-10 Rounds & Questions) with CSV importer. |
| `src/pages/admin/ZonesSetupPage.jsx` | **REPLACE** | Zones are out of scope (PRD §3). Replaced by `app/host/[eventId]/contestants/page.tsx` (S-09 Contestants). |
| `src/pages/admin/GrandPodiumPage.jsx` | **REPLACE** | Replaced by `app/host/[eventId]/results/page.tsx` (S-12 Results & Raffle). |
| `src/pages/admin/SecurityPage.jsx` | **REPLACE** | Non-PRD screen. Operator security managed directly via Supabase Auth and RLS. |

#### Components (`src/components/`)

| File | Disposition | Reason / Plan |
|---|---|---|
| `src/components/HeritageModal.jsx` | **REPLACE** | Not in PRD screen specification. |
| `src/components/admin/CertificateModal.jsx` | **REPLACE** | Out of scope (PRD §3: no PDF generation / certificates). |
| `src/components/admin/QuestionBulkImportModal.jsx` | **ADAPT** | Logic and validation reused in `components/host/QuestionCsvImportModal.tsx` and `lib/csv.ts` with `papaparse` and `zod`. |
| `src/components/stage/DigitalLiveStage.jsx` | **REPLACE** | Replaced by modular projector components in `components/screen/`. |
| `src/components/stage/GrandPodium.jsx` | **REPLACE** | Replaced by Winner and Leaderboard views in `components/screen/`. |
| `src/components/stage/JudgmentStamp.jsx` | **REPLACE** | Replaced by `JudgmentStamp` / `AnswerBadge` conforming to design system tokens. |
| `src/components/stage/NumberBoard.jsx` | **REPLACE** | Legacy number board mode out of scope. |
| `src/components/stage/QuestionCard.jsx` | **ADAPT** | Redesigned into `components/ui/OptionCard.tsx` and `components/screen/ProjectorQuestion.tsx`. |
| `src/components/stage/TitleBar.jsx` | **REPLACE** | Replaced by header components in `components/host/` and `components/screen/`. |
| `src/components/stage/TurnOrderSpinner.jsx` | **REPLACE** | Out of scope; turn order spinner not in PRD. |
| `src/components/stage/UltimateChallenge.jsx` | **REPLACE** | Out of scope; replaced by standard Speed and Individual rounds. |
| `src/components/stage/ZoneScoreboard.jsx` | **REPLACE** | Replaced by `LeaderRow` and leaderboard components in `components/ui/` and `components/host/`. |

---

## 3. Preservation and Transition Strategy

1. **Non-destructive Migration**: Code files from the Vite SPA will be migrated to the Next.js App Router structure in `app/`, `components/`, and `lib/`.
2. **Design Token Alignment**: Tailwind tokens will strictly adhere to `docs/06-DESIGN-SYSTEM.md` (§1 Colors, §2 Typography, §3 Shapes).
3. **RPC Boundary**: Client code will never directly query or update restricted tables; all interactions will route through `lib/rpc.ts`.
4. **Clean Build**: Complete Phase 0 by verifying `typecheck`, `lint`, and `build` commands on the initial Next.js foundation.

