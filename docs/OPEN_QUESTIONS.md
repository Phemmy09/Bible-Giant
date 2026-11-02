# Open Questions & Assumptions Log

This document records ambiguities, design decisions, and owner confirmations per `CLAUDE.md` §0.
Any assumption made in code is flagged with `// ASSUMPTION(Q-n)`.

---

## Active & Resolved Questions

### Q-01: Round Scoring Defaults
- **Status**: Resolved (Default applied)
- **Documented in**: `docs/01-PRD.md` §10
- **Rule**: Default round values are `max_points = 100`, `min_points = 40`, `time_limit_sec = 20`, `wrong_penalty = 0`, `first_correct_bonus = 0`.
- **Assumption**: Operator can customize these per round in the round editor (`S-10`).

### Q-02: Church Logo & Official Brand Imagery
- **Status**: Resolved (Default applied)
- **Documented in**: `docs/01-PRD.md` §10, `docs/06-DESIGN-SYSTEM.md` §7
- **Rule**: Official church leadership permission is required before using church logos in public.
- **Assumption**: Display the text wordmark "Bible Giants" with a subtle gold accent rule unless `public/brand/logo.svg` or `public/brand/logo.png` is provided by the owner.

### Q-03: Number of Options Per Question
- **Status**: Resolved (Default applied)
- **Documented in**: `docs/01-PRD.md` §10, `docs/03-DATA-AND-SECURITY.md` §6
- **Rule**: 2 to 5 options (keys A through E) are supported, with 4 options being the default.

### Q-04: Audio & Sound Effects
- **Status**: Resolved (Scope Locked)
- **Documented in**: `docs/01-PRD.md` §3 (Non-goals), `docs/06-DESIGN-SYSTEM.md` §6
- **Rule**: "No sound" and "No audio/video playback".
- **Action**: Existing audio files in `public/audio/` from the imported codebase are archived and will not be initialized or loaded into the live game engine.

### Q-05: Join Code Character Set
- **Status**: Resolved
- **Documented in**: `docs/01-PRD.md` §6.1, `docs/08-TEST-PLAN.md` U-06
- **Rule**: 5-character join code using uppercase alphanumeric characters, strictly excluding ambiguous characters `0`, `O`, `1`, `I`, `L` (allowing: `23456789ABCDEFGHJKMNPQRSTUVWXYZ`).

### Q-06: Next.js App Router Version Compatibility
- **Status**: Resolved
- **Documented in**: `docs/02-ARCHITECTURE.md` §2
- **Rule**: Use stable Next.js App Router with TypeScript strict mode, `@supabase/ssr`, and React.

---

## Phase A Decisions (Decided by owner in doc 09)

### Q-A101: Question Formats & Client-Side Parser
- **Status**: Decided by owner in doc 09
- **Decision**: Questions can be typed (including Quick-Add with `Ctrl+Enter`) or imported from CSV, Word (`.docx`), and PDF (text-based). All file parsing occurs client-side in the browser before an atomic single-transaction database insert via `host_import_questions`.

### Q-A102: Audience Identity & Join Requirements
- **Status**: Decided by owner in doc 09
- **Decision**: Audience join requires Event Code, Name (1–30 chars), and Assembly / Church (1–60 chars). Phone number is optional (7–20 digits). `join_as_audience(code, name, assembly, phone)` replaces the 2-argument RPC. Phone numbers are stored securely and NEVER exposed to contestants, projector, or other audience members.

### Q-A103: Audience Board Display Size
- **Status**: Decided by owner in doc 09
- **Decision**: Audience leaderboard displays Top 5 everywhere (projector, audience phones, round summary).

### Q-A104: Screen Modes
- **Status**: Decided by owner in doc 09
- **Decision**: `screen_mode` enum includes `round_summary` and `audience_board`. `game_state` tracks `summary_round_id`.


