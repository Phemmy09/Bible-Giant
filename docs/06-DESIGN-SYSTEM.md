# 06 — Design System ("classy, simple, easy")

Feel: a dignified church program — calm navy, warm gold, cream paper. Generous space, large
readable type, very few elements per screen. Never flashy. No gradients except one subtle navy
background gradient on the projector. No emoji in the UI. No stock imagery.

## 1. Colors (define as CSS variables / Tailwind theme tokens, use ONLY these)
| Token | Hex | Use |
|---|---|---|
| `navy-950` | `#07142A` | projector background |
| `navy-900` | `#0B1F3A` | primary dark surfaces, headings on light |
| `navy-700` | `#1C3A63` | secondary surfaces, borders on dark |
| `gold-500` | `#C9A24B` | accents, active states, highlights |
| `gold-300` | `#E3CB8B` | accents on dark |
| `cream-50` | `#FFFDF7` | page background (light screens) |
| `cream-100` | `#FAF6EC` | cards on light |
| `ink-900` | `#1B2330` | body text on light |
| `ink-500` | `#5B6677` | secondary text |
| `success` | `#2E7D5B` | correct |
| `danger` | `#B3402F` | wrong, errors |
| `warning` | `#B7791F` | warnings |
Contrast rule: text on navy uses cream-50 or gold-300; text on cream uses ink-900/navy-900. Minimum 4.5:1.

## 2. Typography
- Headings & big numbers: **Cormorant Garamond** (600/700), used at ≥24 px only.
- UI, body, buttons, labels: **Inter** (400/500/600).
- Scale (px): 14 caption · 16 body · 20 lead · 28 h3 · 36 h2 · 48 h1 · 64 display.
- Projector scale: question 56–72, options 40, leaderboard rows 44, names 48, winner 96.
- Line height 1.4 for body, 1.15 for display. Numbers use `tabular-nums`.

## 3. Spacing, shape, elevation
- 4 px base grid; common gaps 8/12/16/24/32/48.
- Radius: cards 16 px, buttons 12 px, chips 999 px.
- Shadow: one soft shadow only (`0 6px 24px rgba(11,31,58,0.10)`). Borders 1 px navy-700 at 15% on light.

## 4. Components (build once in `components/ui`, reuse everywhere)
- **Button**: primary (navy-900 bg, cream text), gold (gold-500 bg, navy text) for the main stage action, ghost, danger. Min height 44 px (56 px for contestant answer buttons). States: hover, focus ring (2 px gold-500), disabled (50% opacity, not-allowed cursor), pending (spinner).
- **OptionCard** (answer option): letter badge (A–E) in a gold circle + text; states: default, selected, disabled, correct (success), wrong (danger), dimmed.
- **Card**, **Badge/Chip** (status colors), **Input**, **Select**, **Modal** (confirmation), **Toast**, **Spinner**, **ConnectionDot** (green/red + label), **Countdown** (bar for laptops, ring for phones/projector; turns gold at 50%, danger at 20% remaining), **LeaderRow** (rank, photo/initial, name, points, bar).
- Icons: only simple inline SVG (check, cross, copy, expand). No icon library.

## 5. Layout rules
- Contestant/audience: single column, max width 720 px centered (audience 480 px), big tap targets, header + content + footer.
- Host: left nav tabs + content; console is three columns (see S-11) with fixed heights, no page scroll for primary controls at 1366×768.
- Projector: 16:9, content centered, safe margin 64 px, uses `clamp()` sizes so it scales from 1280×720 to 1920×1080.

## 6. Motion
- CSS only: 150–300 ms fade/slide for state changes; leaderboard bar width transition 600 ms; countdown linear.
- Respect `prefers-reduced-motion`.
- No sound.

## 7. Branding
- Top-left wordmark "Bible Giants" in Cormorant, with a small gold cross-free ornament (a thin gold rule under the wordmark).
- Church logo/image slot: `public/brand/logo.svg|png` is shown on Landing, Projector (corner) and Host header ONLY if the file exists. Until the owner provides files with leadership permission, show the text wordmark only. Do not invent or draw church logos.
- Copy tone: warm, respectful, brief. Examples: "Get ready", "Time is up", "Answer received", "Congratulations".

## 8. Accessibility
- All interactive elements keyboard reachable with visible focus; option keys A–E selectable by keyboard.
- Colors never the only signal (add ✓/✗ and text).
- `aria-live="polite"` on status and countdown text; labels on all inputs.
