# Tonypedia v3 — UX/UI Unification Roadmap

**Status:** active · **Owner:** Tony (rinaldipro-svg) · **Executor:** Claude Code (VS Code)
**Rev 2** — corrected against the repo recon of Sep 2026. Rev 1 was written from the live site and got several paths and mechanisms wrong; see `docs/DECISIONS.md` D8–D12.

---

## Why this roadmap exists

The repo runs **three live token vocabularies** across ten files:

- **A (canonical):** `src/styles/tokens.css` — `--bg --bg2 --panel --panel2 --ink --ink-dim --line --amber --sky --acid --violet --rose --green --paper --shadow`. Wired to Tailwind. Already used by `public/signal/index.html` and `public/studies/hbr-*.html`.
- **B:** the five older studies — `--bg-raised --bg-card --bg-hover --border --border-hi --text --text-dim --white --accent --emerald --amber(gold) --orange`.
- **B′:** `quantum.html` — B plus `--bg-elevated --border-accent --warm --blue --yellow --purple`.

P1 collapses B and B′ into A. Everything in P1 exists to make P2 a one-file edit. Do not reorder them.

Secondary goals: unbreak the local build, correct the canonical domain, retire the SIGNAL name, restore the content pipeline (dead since 2026-08-31).

---

## Phase map

| Phase | Name | Tickets | Blocked by |
|---|---|---|---|
| **P0** | Environment + metadata hotfix | 4 | — |
| **P1** | Token + type unification | 10 | P0-00 |
| **P2** | Teal palette + light mode | 4 | P1 |
| **P3** | SIGNAL removal → "AI Feed" | 3 | P1 |
| **P4** | Pipeline restore | 4 | P3 |
| **P5** | Polish | 5 | P2, P3 |

**Critical path:** P0-00 → P1 → P2. Nothing can be verified until P0-00 lands — `npm run build` and `astro check` both fail for environmental reasons, so every acceptance gate below is currently unrunnable.

Run **P2 before P3**. Both touch the feed page, but different concerns.

---

## Execution protocol

One ticket per session. `/clear` between. Tickets are self-contained — CC should never read this file to execute one; paste the ticket body directly.

Branch per phase: `phase/p1-tokens`. One PR per phase, squash-merged to `main`.

**Acceptance greps run against a fresh `dist/`.** `dist/` is git-ignored and was never tracked (D16), so a stale checkout is the only risk — rebuild before grepping.

---

# P0 — Environment + metadata hotfix

> Branch: `phase/p0-hotfix` · 4 commits

### P0-00 — Restore a working local build ⚠️ BLOCKER

`node_modules` was provisioned by `npm ci` on `ubuntu-latest`; this host is `darwin-arm64`. Two failures: `node_modules/.bin/astro` is mode 0664 (no exec bit), and `@rollup/rollup-darwin-arm64` is absent. `package.json` pins `@rollup/rollup-linux-x64-gnu` as its only `optionalDependencies` entry — that pin is the root cause and should not exist.

```
1. Remove the @rollup/rollup-linux-x64-gnu pin from package.json
   optionalDependencies. Rollup resolves its own platform binary; pinning
   one platform breaks every other host.
2. rm -rf node_modules package-lock.json && npm install
3. Verify: npm run build, then npx astro check. Report both verbatim.

If the build now surfaces genuine SOURCE errors (as opposed to the two
environmental ones), report them and STOP. Do not fix them in this ticket.
```

**Accept:** `npm run build` exits 0, and `npx astro check` runs to completion. A source error surfaced by `astro check` — one not caused by the environmental `node_modules` mismatch — becomes its own ticket rather than failing P0-00.

---

### P0-02 — Correct the canonical domain

Six source hits in **four** places — three of which sit outside Astro's `site` and will not be fixed by an Astro-side change.

```
astro.config.mjs:9                    site: 'https://tonypedia.pages.dev'
public/robots.txt:3                   Sitemap: https://tonypedia.pages.dev/...
workers/chatbot-api/index.ts:52       SITE_URL fallback
workers/chatbot-api/wrangler.toml:7   vars SITE_URL
README.md:120, :175                   docs

ASK TONY which host is canonical (workers.dev vs a custom domain) BEFORE
editing. Do not assume.

Note: the X share button (ArticleLayout.astro:68) builds from
new URL(Astro.request.url).href and contains no pages.dev literal. Rev 1
of this roadmap was wrong about that. Leave it alone.
```

**Accept:** after the fix,

```
grep -rl "pages.dev" . --exclude-dir=node_modules --exclude-dir=dist \
  --exclude=ROADMAP.md --exclude=DECISIONS.md --exclude=CLAUDE.md \
  --exclude=DESIGN-TOKENS.md
```

returns nothing. It flags **5 files today**: `README.md`, `astro.config.mjs`, `public/robots.txt`, `workers/chatbot-api/index.ts`, `workers/chatbot-api/wrangler.toml`. The governance docs quote `tonypedia.pages.dev` as the string they document and are excluded — never reword doc prose to pass a grep (D17). Fresh `dist/` also clean.

---

### P0-03 — Fix empty `og:image`

**The Rev 1 premise was wrong.** 15 of 16 article `.md` files set `heroImage: ""` — an empty string, not an omission. `ArticleLayout` passes `ogImage={heroImage}`, so `BaseLayout`'s `ogImage = '/og-image.jpg'` default never fires. A fix guarding on `undefined` will not catch this.

```
In ArticleLayout.astro, pass ogImage={heroImage || undefined} so the
BaseLayout default fires. Verify BaseLayout also guards against an empty
string arriving from any other caller.

Do not edit the 16 article .md files.
```

**Accept:** fresh `dist/`; `grep -rc 'og:image" content=""\|og:image" content>' dist/` returns `0`.

---

# P1 — Token + type unification

> Branch: `phase/p1-tokens` · 10 commits
> **Zero visual change except typeface.**

### P1-01 — Relocate and extend the canonical token file

`src/styles/tokens.css` already exists, is already labelled single-source-of-truth, and is already imported by `src/styles/global.css`. It is **not** reachable from `public/` — Astro does not process that directory — which is why the eight standalone files each carry their own `:root`.

```
1. Move src/styles/tokens.css → public/styles/tokens.css.
   Update src/styles/global.css line 1 to:
     @import '../../public/styles/tokens.css';
   One authored file, served statically AND bundled. No sync step.

2. Extend the :root. Keep every existing token and its current warm value —
   this ticket adds vocabulary, it does not recolour.

     --panel3:     <one step above --panel2>  /* absorbs studies' --bg-hover */
     --gold:       #fbbf24                     /* the studies' --amber */
     --teal:       #5cc8ff                     /* PLACEHOLDER = current --sky */
     --teal-soft:  #7fe7db                     /* placeholder */

   Do NOT add --*-dim or --*-glow tokens. Those stay local to each file,
   computed with color-mix() from their parent. See DESIGN-TOKENS §4.

3. Header the file: single source of truth; no other file defines colour
   values; no --tp-* prefix (docs/DECISIONS.md D8).
```

**Accept:** `public/styles/tokens.css` exists; build clean; site visually unchanged.

---

### P1-02 — `public/styles/type.css`

**Rev 1 said "match SIGNAL's font link exactly." That is wrong** — it would drop the italic axis and weights 500/600 that Astro components rely on (`.italic-accent`, `font-medium`).

```
Create public/styles/type.css with ONE Google Fonts request that is the
UNION of BaseLayout.astro's request and public/signal/index.html's:
  Fraunces — ital + opsz + wght 400/600/900, italics 400/600
  Space Grotesk — 400/500/600/700
  JetBrains Mono — 400/500/600/700

Define --font-display / --font-sans / --font-mono. Check whether
BaseLayout or tokens.css already defines these names; reuse if so.

Then remove the Google Fonts <link> from BaseLayout.astro and link
type.css instead.
```

**Accept:** one font request site-wide; no weight or axis present before that is absent after.

---

### P1-03 … P1-08 — Alias the six older studies

**One ticket per file. One commit per file. Do not batch.**
Ordered easiest → hardest; `quantum` last, it has the most idiosyncratic vocabulary.

| Ticket | File | `--accent` → |
|---|---|---|
| P1-03 | `public/studies/uranium_nuclear.html` | `--amber` |
| P1-04 | `public/studies/coppernico.html` | `--amber` (via `--copper`) |
| P1-05 | `public/studies/rare_materials.html` | `--green` |
| P1-06 | `public/studies/robotics_matrix.html` | `--teal` |
| P1-07 | `public/studies/Global_Dom.html` | `--violet` |
| P1-08 | `public/studies/quantum.html` | `--teal` |

Ticket body:

```
File: public/studies/[FILENAME]

READ THE FILE FIRST. Report the actual :root variable names before editing.

1. Add in <head>, BEFORE the existing <style> block:
     <link rel="stylesheet" href="/styles/tokens.css">
     <link rel="stylesheet" href="/styles/type.css">
2. Remove the three Google Fonts <link> tags.
3. Replace the :root block with an ALIAS block per the mapping table in
   docs/DESIGN-TOKENS.md §4. KEEP EVERY ORIGINAL VARIABLE NAME.
   This file's --accent maps to: [ACCENT]
4. Express --*-dim and --*-glow with color-mix, not literals:
     --accent-dim:  color-mix(in srgb, var([ACCENT]) 10%, transparent);
     --accent-glow: color-mix(in srgb, var([ACCENT]) 20%, transparent);
   Preserve this file's existing opacities (studies use 0.10, SIGNAL 0.12).
5. Update font-family declarations to var(--font-*).

Zero markup or class-name changes. Report anything you cannot map. DO NOT
GUESS — an unmapped token is a finding, not a blocker.
```

**Accept per file:** renders identically except typeface; no literal hex remains in its `:root`.

---

### P1-09 — SIGNAL + hbr: link the shared files

These two **already use vocabulary A**, so they need linking and de-duplication, not aliasing.

```
Files:
  public/signal/index.html
  public/studies/hbr-why-great-innovations-fail-to-scale.html
(The hbr file is the 8th standalone study; Rev 1's P1 table omitted it.
 The studies collection has 7 entries, not 6.)

For each: link /styles/tokens.css and /styles/type.css, remove the Google
Fonts links, and DELETE from its local :root every token whose name AND
value already match the canonical file. Keep only genuine local overrides
(e.g. hbr's --accent #5cc8ff). Report what you kept and why.
```

---

### P1-10 — Tailwind

```
tailwind.config.mjs already maps colours to var(--bg) etc. Add the tokens
introduced in P1-01: --panel3, --gold, --teal, --teal-soft.

NOTE: the content glob is ./src/**/* only, so Tailwind does not scan
public/. Rev 1 claimed this ticket makes "Tailwind utilities and standalone
HTML resolve to the same values" — only the CSS-variable indirection
bridges them; JIT class generation does not. Do NOT widen the glob to
public/ (it would scan eight large HTML files every build for no gain).
```

---

# P2 — Teal palette + light mode

> Branch: `phase/p2-palette` · 4 commits · **Blocked by P1**

### P2-01 — Flip palette values

Single edit to `public/styles/tokens.css`, values from `docs/DESIGN-TOKENS.md` §2.

**Accept:** the diff is confined to one file.

---

### P2-02 — Promote teal to identity in components

P2-01 changes values but not *which token* carries identity. `--amber` currently does, in at least four places.

```
Grep src/ for: text-amber, var(--amber), --amber. Report every hit with its
role BEFORE editing.

Known hits to switch to teal:
  - Navbar.astro brand dot: <span class="text-amber">●</span>
  - Navbar.astro #mobile-overlay scoped CSS:
      .mobile-overlay-link.is-active{color:var(--amber)}
  - the desktop active pill (currently bg-ink text-bg — confirm intent)
  - Footer.astro brand dot, if present

Rule: identity → teal. Signal / CTA → stays amber. docs/DESIGN-TOKENS.md §3.
```

---

### P2-03 — Visual QA

Checklist, not code. All page types at 390px and 1440px. Log breakage; fixes become P5 tickets.

**Watch:** `--bg` → `--panel` is a **1.11:1** luminance step. Cards will merge on low-end phone panels and in daylight. Compensate with `--line` borders, **never** by lightening the surfaces — that destroys the depth the palette is built on.

---

### P2-04 — Light mode, reading contexts only

**`src/scripts/theme.ts` already exists, is imported nowhere (dead), and uses a different mechanism** than the spec: cookie `theme` + `html.classList` `light`. No `.light` or `[data-theme]` selector exists in any stylesheet.

```
Decide first, then implement. Either adopt theme.ts's cookie+class approach
and update docs/DESIGN-TOKENS.md §5 to match, or delete theme.ts and build
the spec. Report your recommendation BEFORE writing code.

Spec: [data-theme="light"] on <html>, localStorage["tp-theme"], inline
<head> script read before first paint (no FOUC).

Toggle appears ONLY on article and study pages. Hub, AI Feed, category and
tag pages stay dark. NO toggle in the global nav.
```

---

# P3 — SIGNAL removal → "AI Feed"

> Branch: `phase/p3-ai-feed` · 3 commits · **Blocked by P1**

**Two Rev 1 errors corrected.** There is no `public/SIGNAL-ai-knowledge-base.html` — the file is `public/signal/index.html`, a directory index. And the redirect already exists **backwards**: `src/pages/feed.astro` currently sends `/feed/` → `/signal/`.

### P3-01 — Invert the route

```
1. git mv public/signal/ public/feed/
   Keeps it a directory index, so the URL becomes /feed/. NOT a flat
   public/ai-feed.html — that would serve /ai-feed, which is not what D1
   specifies.
2. Delete src/pages/feed.astro (it redirects /feed/ → /signal/; the static
   directory now owns that route).
3. Create src/pages/signal.astro: Astro.redirect('/feed/', 301).
   The repo has no _redirects file and no redirects: config — per-page
   Astro.redirect() is the established mechanism. Use it.
4. Update href="/signal/" in all SEVEN studies' injected navbars
   (quantum ×3, hbr ×2, robotics ×2, rare_materials ×2, Global_Dom,
   coppernico, uranium_nuclear) → "/feed/".
5. Navbar.astro: label "Feed" → "AI Feed"; href → '/feed/';
   path.startsWith('/signal') → '/feed'.
6. Footer.astro has its OWN sections array (lines 4-8) — a FOURTH nav
   rendering Rev 1 missed. Update it too.

DO NOT touch the word "signal" in article prose, the Newsletter headline
("The signal — not the noise."), or USGS references. Those are English.
```

**Accept:** `/signal/` 301s to `/feed/`; and

```
grep -rl 'href="/signal/"' . --exclude-dir=node_modules --exclude-dir=dist \
  --exclude=ROADMAP.md --exclude=DECISIONS.md --exclude=CLAUDE.md \
  --exclude=DESIGN-TOKENS.md
```

returns nothing. This ticket body quotes `href="/signal/"`, so the governance docs are excluded from the gate (D17).

---

### P3-02 — Strip SIGNAL identity from the page

```
File: public/feed/index.html (post-P3-01). READ IT FIRST.

1. <title> → "AI Feed — Tonypedia". Add meta description, og:*,
   twitter:card, theme-color — match BaseLayout.astro's pattern.
2. Replace the "SIG<b>NAL</b> v0.1" masthead with an "AI Feed" header.
3. DELETE the internal studies vault entirely: the "Deep-dive research
   library / The studies vault" block, its filter bar, cards, embed modal,
   and the "Back to studies" / "viewing in SIGNAL" chrome. Replace with a
   single link to /studies. It duplicates the real Deep Dives index.
4. Remove the internal sub-nav tabs — the global nav covers this.
5. Rewrite the two SIGNAL-branded prose blocks. Keep the compiler framing.
6. Remove now-dead CSS. Report what you removed.

DO NOT touch the ENTRIES array or the card rendering — that is P4.
```

---

### P3-03 — Copy sweep

`Footer.astro` blurb "a live GenAI intelligence feed" → "a live AI Feed". `Newsletter.astro` "Intelligence Feed highlights" → "AI Feed highlights". README, `docs/content-automation.md`.

Leave the Newsletter *headline* ("The signal — not the noise.") alone — it is the English word and it is good.

---

# P4 — Pipeline restore

> Branch: `phase/p4-pipeline` · 4 commits · **Blocked by P3**
> Dead since **2026-08-31** with `not_found_error`.

### P4-01 — Sonnet 5 migration

**Two files, not one** (Rev 1 said one):

```
scripts/content-agent/lib/anthropic.ts:36   claude-sonnet-4-20250514
workers/content-feed-bot/index.ts:169       claude-sonnet-4-20250514
```

`workers/chatbot-api/index.ts:100` runs `claude-3-5-haiku-20241022` — a third model string, out of scope, but flag whether it should move too.

Read the migration guide; reconcile changed request parameters. Check whether anything queued and was lost since Aug 31.

**Accept:** three test `/hub` articles diffed against known-good Sonnet 4 output. **Sonnet 5 follows instructions more literally** and the Hub prompt was tuned against Sonnet 4. Do not run it unattended until the diff is reviewed.

---

### P4-02 — `ENTRIES` → injected JSON

The `feed` collection is defined at `src/content/config.ts:34-46` (title, source, category enum, accent, size enum, blurb, date, tags) and **`src/content/feed/` does not exist**. Zero content files. Confirmed unused.

```
Keep public/feed/index.html's markup and CSS byte-for-byte. Replace
  const ENTRIES = [ ...hardcoded... ];
with
  const ENTRIES = JSON.parse(document.getElementById('feed-data').textContent);

Add a build step emitting <script type="application/json" id="feed-data">
from the feed collection. Create src/content/feed/ and migrate the existing
hardcoded entries into it as .md files matching the Zod schema.

DO NOT rebuild the feed page in Astro. Evaluated and rejected — see D6.
```

---

### P4-03 — Static fallback cards

`/feed/` renders "0 entries, 0 domains" server-side today. The entire section is invisible to search and to link previews.

**Accept:** `curl -s <url>/feed/ | grep -c "<article"` > 0.

---

### P4-04 — Bot command split

One bot, two commands (D2). `/hub <topic>` unchanged. `/feed` + photo or link → Sonnet 5 vision, base64 image, **strict JSON against the `feed` Zod schema**. Validate *before* the approval email; reject malformed output rather than emailing it.

---

# P5 — Polish

> Branch: `phase/p5-polish` · **Blocked by P2, P3**

| Ticket | Work |
|---|---|
| **P5-01** | Wide study tables (robotics 50-company matrix, rare materials financials) → horizontal-scroll wrappers with a visible affordance. |
| **P5-02** | Consolidate nav. Smaller than Rev 1 assumed: the three renderings already share one `sections` array inside `Navbar.astro`. The real duplication is `Footer.astro`'s **separate** array — extract both to one shared const. |
| **P5-03** | Clean study URLs. `src/pages/studies/[slug].astro:16` currently redirects **clean-slug → `.html`**; invert it. Actual slugs come from the `.mdx` filenames (e.g. `global-dominance-30-technologies`), not Rev 1's invented examples. `htmlFile` frontmatter is already the single map — do not build a second. |
| **P5-04** | Movies. **There is no literal "5" to change**: `StatsBar.astro:12` computes `new Set(articles.map(a => a.data.category)).size`, while `index.astro:42` renders all 6 `CATEGORY_KEYS` lanes unconditionally. Either filter the lane render to categories that have articles, or accept the empty state. Decide; don't patch the counter. |
| **P5-05** | Category chips: emoji prefixes give inconsistent glyph widths across iOS/Android in the horizontal scroller. |

---

## Backlog

- Related-articles block is client-only ("Loading related articles…" server-side) — zero crawlable internal linking between articles.
- **CI does not build the site.** `.github/workflows/` runs only content generation; build/deploy is Cloudflare-side. Adding a build check would make the PR gate in D5 real rather than nominal.
- Per-article OG images (P0-03 only restores the fallback).
- Logo/brand finalization.

---

## Definition of done, per phase

1. Tickets committed, conventional format, no co-author trailers.
2. `npm run build` clean; `npx astro check` passes.
3. Visual check at 390px and 1440px.
4. PR opened, squash-merged to `main`.
5. `docs/DECISIONS.md` updated if a decision was made or reversed.
