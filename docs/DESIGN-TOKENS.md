# Design Tokens — Tonypedia v3

**Rev 2.** Rev 1 proposed a `--tp-*` prefix. That is **withdrawn** — `src/styles/tokens.css` already existed as the SSOT with an un-prefixed vocabulary that Tailwind, `public/signal/index.html` and the hbr study already consume. Prefixing would have created a fourth vocabulary to solve a problem caused by three. See `docs/DECISIONS.md` D8.

Single source of truth: **`public/styles/tokens.css`** (moved there in P1-01 so `public/` can reach it; `src/styles/global.css` imports it relatively).

No other file defines colour values. The eight standalone HTML files carry alias blocks only.

---

## 1. Direction

The old base is warm near-black (`#0c0a08`) with orange as the primary accent. That reads as *terminal / underground* — wrong for what Tonypedia is.

The new base is a cool deep teal-slate, with orange demoted to a single rationed signal colour. That reads as *research institute*, which is accurate.

Aligned with the arcsharing.com family — same temperature, lighter and warmer at the edges. Values are tuned by contrast measurement, not sampled from that site. To match it precisely, sample the source and retune.

---

## 2. Dark mode (default)

Contrast measured against `--bg`. All body-text and accent pairings meet WCAG AA.

**P2-01 note:** `--orange` is a hand-kept literal copy of `--amber` (see §4 / D21). Any commit that repaints `--amber` must repaint `--orange` to the identical new value.

```css
:root {
  /* base */
  --bg:        #071A1F;
  --bg2:       #0A2027;
  --panel:     #0C242B;
  --panel2:    #102E36;
  --panel3:    #163A44;   /* new in P1-01; absorbs studies' --bg-hover */
  --line:      rgba(127,231,219,0.10);
  --line2:     rgba(127,231,219,0.18);

  /* text */
  --ink:       #E8F4F5;   /* 15.9:1 */
  --ink-dim:   #9DB8BD;   /*  8.5:1 */
  --ink-faint: #6B888E;   /*  4.7:1 on --bg — see note */
  --paper:     #E8F4F5;   /* brightest ink; absorbs studies' --white */

  /* primary — teal */
  --teal:      #2FD4C0;   /*  9.6:1 */
  --teal-soft: #7FE7DB;   /* 12.2:1 */

  /* secondary — blue */
  --sky:       #56A9E8;   /*  7.0:1 */

  /* accent — orange, rationed */
  --amber:     #FF8A45;   /*  7.6:1 */
  --amber-soft:#FFB07A;
  --orange:    #FF8A45;   /* === --amber; hand-kept in sync, NOT a var() reference — see D21 */

  /* category accents */
  --gold:      #FBBF24;   /* 10.7:1 — new in P1-01; the studies' --amber */
  --green:     #4ADE80;   /* 10.2:1 */
  --acid:      #A3E635;
  --rose:      #FB7185;   /*  6.6:1 */
  --violet:    #A78BFA;   /*  6.6:1 */

  --on-accent: #04171C;   /* on teal 9.9:1 · on amber 7.8:1 */
  --shadow:    0 18px 50px -18px rgba(0,0,0,.85);
}
```

**`--ink-faint` caveat:** 4.71:1 on `--bg` but **3.78:1 on `--panel2`**. Below AA for body text. Restrict to non-essential labels and large text. Never use it for anything a reader must read.

**Surface separation caveat:** `--bg` → `--panel` is a **1.11:1** luminance step (`--bg` → `--bg2` is 1.06:1). Intentional — it produces a soft, layered feel. But cards *will* merge on low-end phone panels and in daylight. Compensate with `--line` borders. Do **not** lighten the surfaces; that destroys the depth the palette is built on.

---

## 3. Usage discipline

This matters more than the hex values. It is what stops the palette becoming mush.

| Token | Carries | Examples |
|---|---|---|
| `--teal` | **Identity** | Logo dot, active nav, section numerals, rules, hover states |
| `--sky` | **Navigation** | Links, "read more", breadcrumbs, tag chips |
| `--amber` | **Signal, rationed** | Featured badge, "new" pill, newsletter CTA |
| `--gold` `--green` `--rose` `--violet` `--acid` | **Taxonomy only** | Feed card categories, study accents |

**The amber rule: one amber element per viewport, maximum.** Its power is that it is rare. The moment amber appears twice on a screen it stops meaning anything and the palette reverts to exactly what we just left.

Note that `--amber` currently carries *identity* in the codebase (Navbar brand dot, mobile-overlay active state). P2-02 exists specifically to move that role to `--teal`. Flipping values without doing P2-02 leaves an orange-identity site with a teal palette.

Category accents never leak outside Feed cards and study headers. They are taxonomy, not decoration.

---

## 4. Legacy → canonical mapping

Reference for the P1-03…P1-08 alias tickets. **Verify against the actual file before use.** Derived from the Sep 2026 recon; the file is authoritative.

### Surfaces, text, lines

| Legacy | Files | → |
|---|---|---|
| `--bg` | all | `--bg` (unchanged) |
| `--bg-raised`, `--bg-elevated` | 6 studies | `--panel` |
| `--bg-card` | 6 studies | `--panel2` |
| `--bg-hover` | 6 studies | `--panel3` |
| `--border` | 6 studies | `--line` |
| `--border-hi`, `--border-accent` | 6 studies | `--line2` |
| `--text` | 6 studies | `--ink` |
| `--text-dim` | 6 studies | `--ink-dim` |
| `--text-muted` | 6 studies | `--ink-faint` |
| `--white` | 5 studies | `--paper` |

### Colours

| Legacy | Files | → | Note |
|---|---|---|---|
| `--accent` | per-file | see ROADMAP P1 table | differs per study |
| `--accent` (rare_materials only) | rare_materials | `var(--acid)` | overrides the generic `--accent` row for this file — see collision note above |
| `--accent` (Global_Dom only) | Global_Dom | `var(--acid)` | same |
| `--emerald` | 5 studies | `--green` | |
| `--sky`, `--blue` | several, quantum | `--sky` | quantum calls it `--blue` (`#4d8bff`) |
| `--violet`, `--purple` | several, quantum | `--violet` | |
| `--rose` | 5 studies | `--rose` | |
| `--orange` | Global_Dom, robotics, rare_materials | `var(--orange)` | ⚠️ see collision below |
| `--amber` (studies, `#fbbf24`) | Global_Dom, coppernico, robotics, rare_materials | `--gold` | ⚠️ see collision below |
| `--yellow` (quantum, `#fbbf24`) | quantum | `--gold` | |
| `--warm` (quantum, `#ff6b4a`) | quantum | `--amber` | |
| `--copper` | coppernico | `var(--orange)` | ⚠️ see collision below |
| `--copper-light` | coppernico | `--amber-soft` | |
| `--acid` | signal | `--acid` | unchanged |
| `--shadow` | signal, hbr | `--shadow` | unchanged |

A row mapping a legacy name to an identically-named canonical token (`--sky`, `--rose`, `--violet`, `--acid`, `--shadow`, `--bg`) means: omit that variable from the file's alias block entirely, so it inherits the canonical value from the linked `/styles/tokens.css`. Do NOT write `--sky: var(--sky)` — that is a self-reference, invalid at computed-value time per the CSS spec, and every consumer silently falls back to inherited colour instead. This applies retroactively to every P1-03…P1-09 alias block.

### ⚠️ The `--amber` collision

`--amber` means **two different things** in this repo:

- In `tokens.css` / SIGNAL: `#ff7a2f`, the **primary orange**.
- In four studies: `#fbbf24`, a **gold**, sitting alongside a *separate* `--orange` (`#fb923c`).

Resolution: canonical `--amber` stays the orange, and canonical `--orange` (added in P1-04a, made a literal in P1-04b) is an independent copy of its value. The studies' gold becomes `--gold`. So in those four files the alias block reads:

```css
--copper: var(--orange);   /* or --orange: … if that is the study's own name for this accent */
--amber:  var(--gold);     /* the collision line — only --amber is overridden locally */
```

`--orange` must be a literal equal to `--amber`'s value, not a `var(--amber)` reference — a reference would resolve against `--amber`'s cascade-shadowed value inside the study's own block, collapsing both accents to the same colour. See D21. (A study whose accent is literally named `--orange` omits that line entirely per D19 — its `--orange` already resolves to canonical.)

Read the `--amber: var(--gold)` line twice before writing it. It is still the single most error-prone line in P1.

### Accent/sibling collisions (`--green`, `--violet`)

Two files declare an `--accent` alongside another named variable that already targets the same canonical token: `rare_materials.html` (`--accent` + `--emerald` → `--green`) and `Global_Dom.html` (`--accent` + `--violet` → `--violet`). Resolution: that file's `--accent` aliases to `--acid` instead (canonical, currently unused, taxonomy-only per §3). The sibling (`--emerald` / `--violet`) keeps its normal mapping. This preserves visual distinctness without adding new canonical vocabulary. See D22.

### `--*-dim` and `--*-glow`

**Not canonical tokens.** Each file defines its own with `color-mix()`, preserving its existing opacity (studies use 0.10, SIGNAL 0.12):

```css
--accent-dim:  color-mix(in srgb, var(--teal) 10%, transparent);
--accent-glow: color-mix(in srgb, var(--teal) 20%, transparent);
```

This keeps the canonical file small instead of adding ~20 near-duplicate tokens that differ only by two percentage points.

---

## 5. Light mode (opt-in, reading contexts only)

Available **only on article and study pages** — the two long-form reading contexts, where a dark theme costs most in daylight on a phone. Hub, AI Feed, category and tag pages stay dark permanently. No toggle in the global nav.

```css
[data-theme="light"] {
  --bg:        #F2F7F7;
  --bg2:       #EDF4F4;
  --panel:     #FFFFFF;
  --panel2:    #E9F1F1;
  --line:      rgba(11,33,41,0.10);

  --ink:       #0B2129;   /* 15.4:1 */
  --ink-dim:   #4A6670;   /*  5.7:1 */
  --ink-faint: #6B7F86;
  --paper:     #04171C;

  --teal:      #0F766E;   /*  5.1:1 */
  --sky:       #1D6FA5;   /*  5.0:1 */
  --amber:     #B44A12;   /*  4.9:1 */

  --on-accent: #FFFFFF;
}
```

**Mechanism is unresolved.** `src/scripts/theme.ts` already exists, is imported nowhere, and uses cookie `theme` + `html.classList` `light` — not `[data-theme]`, not `localStorage`. P2-04 requires picking one and updating this section to match. Whichever wins, the read must happen in an inline `<head>` script before first paint, or every load flashes dark.

---

## 6. Typography

Single source: `public/styles/type.css`. One Google Fonts request site-wide.

```css
--font-display: 'Fraunces', ui-serif, Georgia, serif;
--font-ui:      'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
--font-mono:    'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
```

The request must be the **union** of BaseLayout's and SIGNAL's, not a copy of either. SIGNAL omits the italic axis and weights 500/600 that Astro components use (`.italic-accent`, `font-medium`); BaseLayout omits Space Grotesk 700 and JetBrains 700.

Replaces the pre-P1 split, where Astro + SIGNAL + hbr ran Fraunces / Space Grotesk while the six older studies ran Playfair Display (or Instrument Serif) / DM Sans. Navigating between sections visibly changed typeface, and each standalone file issued its own three uncached font requests.
