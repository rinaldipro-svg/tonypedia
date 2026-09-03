# Decisions

Append-only. Newest at the bottom. One short entry per decision — enough that nobody re-litigates it in six months, not a design doc.

Format: **what was decided**, **why**, **what it rules out**.

---

## D1 — Retire the name SIGNAL; the section is "AI Feed" everywhere
**2026-09** · *Roadmap P3*

One section had four names: nav said "Feed", the URL was `/signal/`, the page header said "SIGNAL", the footer said "GenAI intelligence feed", the newsletter said "Intelligence Feed highlights".

"AI Feed" is now the only name — nav, URL, page title, footer, prose, OG tags. `/signal/` 301s to `/feed/` permanently, since the old URL may already be shared.

**Rules out:** SIGNAL as a retained sub-brand. It does not survive as a versioned label, a masthead, or a wordmark.

---

## D2 — One Telegram bot, two commands
**2026-09** · *Roadmap P4-04*

`/hub <topic>` produces a long-form article. `/feed` plus a photo or forwarded link produces a Feed card.

Two bots would mean two tokens, two webhooks, two deploy targets, and forgetting which one to text. The Feed handler is a different prompt and a different output schema — not different infrastructure.

**Rules out:** a separate screenshot-ingestion bot; routing the Feed through Notion.

---

## D3 — Light mode scoped to reading contexts only
**2026-09** · *Roadmap P2-03*

Light is opt-in on article pages and study pages only. Everything else stays dark permanently, with no toggle in the global nav.

Reading a 12-minute study on a phone in daylight is where a dark theme actually costs something. The Hub landing and the AI Feed are where the editorial drama lives, and a light variant would flatten them.

**Rules out:** a global light/dark toggle; light as a default anywhere.

---

## D4 — Tokens before palette
**2026-09** · *Roadmap P1 → P2*

Token and type unification (P1) ships before the teal migration (P2), even though P1 produces almost no visible change.

Eight standalone files each declared their own `:root` with different variable *names*. Flipping the palette first would mean eight hand-edits and eight chances to drift. After P1 it is one file.

**Rules out:** starting with the visible win. P1 is boring and non-negotiable.

---

## D5 — Solo-calibrated git protocol
**2026-09**

Branch per phase (`phase/p2-palette`), one PR per phase, squash-merge to `main`. CI check required: `astro check` + `npm run build`. **No required reviewer — self-merge allowed.**

Branch protection that blocks a solo operator from merging their own work is theatre. It adds a click and catches nothing. The CI gate catches what a reviewer would actually catch here: a broken build.

The PR is still worth opening — it gives a per-phase diff to review before it lands, which is the real value.

**Revisit if:** a second contributor joins, at which point required review becomes worth the friction.

---

## D6 — The AI Feed page stays standalone HTML
**Pre-existing, restated here**

`public/ai-feed.html` is not rebuilt in Astro. An Astro rewrite was evaluated and rejected as a fidelity downgrade.

P4-02 makes it pipeline-addressable *without* rewriting it: the hardcoded `const ENTRIES = [...]` becomes `JSON.parse()` of a build-time-injected `<script type="application/json">`, emitted from the existing `feed` content collection. Markup and CSS untouched.

**Rules out:** re-proposing an Astro rebuild as a way to unlock the pipeline. That problem is solved.

---

## D7 — `htmlFile` frontmatter is the single source of truth for study slugs
**Pre-existing, restated here**

Two duplicated hardcoded slug-to-filename maps were already eliminated in favor of `htmlFile` frontmatter.

P5-03 (clean study URLs) must read from it. **Do not build a third map.**

---

## Open

- **Study URL rename timing** — scheduled P5-03 to avoid colliding with the P3 AI Feed rename. Could move earlier if the `.html` URLs are bothering you sooner.
- **Movies category** — assumed hidden, not deleted (P5-04). Reversible.
- **Per-article OG images** — P0-02 only adds a `/og-image.jpg` fallback. Real per-article generation is backlog.

---

## D8 — No `--tp-*` prefix; the existing un-prefixed vocabulary is canonical
**2026-09** · *Reverses part of Rev 1 · Roadmap P1-01*

Rev 1 of the roadmap specified a new `--tp-*` token namespace. Recon found that `src/styles/tokens.css` **already existed**, was already labelled single-source-of-truth, was already imported by `global.css`, was already wired to `tailwind.config.mjs`, and was already consumed by two of the eight standalone HTML files.

Introducing `--tp-*` would have created a **fourth** vocabulary to solve a problem caused by three, and forced edits to Tailwind config, `global.css`, SIGNAL and the hbr study for no benefit.

Canonical vocabulary is `--bg --bg2 --panel --panel2 --ink --ink-dim --line --amber --sky --acid --violet --rose --green --paper --shadow`, extended in P1-01 with `--panel3 --gold --teal --teal-soft`.

**Rules out:** any token prefix. Removes two P1 tickets and roughly a third of the phase's work.

---

## D9 — Tokens authored at `public/styles/tokens.css`
**2026-09** · *Roadmap P1-01*

Astro does not process `public/`, so the eight standalone HTML files cannot reach `src/styles/tokens.css`. That is the actual reason each carries its own `:root`.

The file moves to `public/styles/tokens.css` and `src/styles/global.css` imports it relatively (`@import '../../public/styles/tokens.css'`). One authored file, served statically *and* bundled.

**Rules out:** a build-time copy step, or two files kept in sync.

---

## D10 — `--gold` resolves the `--amber` collision
**2026-09** · *Roadmap P1 · DESIGN-TOKENS §4*

`--amber` means two things: `#ff7a2f` (primary orange) in `tokens.css`/SIGNAL, and `#fbbf24` (a gold, sitting next to a separate `--orange`) in four studies.

Canonical `--amber` keeps the orange. A new `--gold` absorbs the studies' value. In those four alias blocks: `--amber: var(--gold)` and `--orange: var(--amber)`.

`--*-dim` and `--*-glow` are **not** canonical tokens — each file computes them locally with `color-mix()`, preserving its own opacity. Avoids ~20 near-duplicates differing by two percentage points.

`--paper` (`#f4ede0`) already fills the `--white` role. Not an unmappable after all.

---

## D11 — `/feed/` is a directory index; `/signal/` redirects to it
**2026-09** · *Roadmap P3-01 · refines D1*

Rev 1 said "rename `public/SIGNAL-ai-knowledge-base.html` → `public/ai-feed.html`". That file does not exist — the page is `public/signal/index.html`, a directory index. A flat `public/ai-feed.html` would also serve `/ai-feed`, not `/feed/`.

Correct move: `git mv public/signal/ public/feed/`. Delete `src/pages/feed.astro` (which currently redirects `/feed/` → `/signal/`, the wrong direction). Add `src/pages/signal.astro` with a 301 to `/feed/`.

The repo has no `_redirects` file and no `redirects:` config. **Per-page `Astro.redirect()` is the established mechanism.**

---

## D12 — `dist/` is untracked
**2026-09** · *Roadmap P0-01*

A stale build was committed: 159 `pages.dev` references across ~130 files, plus `_worker.js` chunks. It poisons every grep-based acceptance gate in this roadmap and makes the repo's real state unreadable.

Cloudflare builds from source. The committed artefact serves no purpose.

---

## D13 — Rev 1 acceptance criteria were unrunnable
**2026-09** · *Roadmap P0-00*

`node_modules` was provisioned by `npm ci` on `ubuntu-latest`; the dev host is `darwin-arm64`. `npm run build` and `npx astro check` both fail — missing exec bit, missing `@rollup/rollup-darwin-arm64`. Root cause is a `@rollup/rollup-linux-x64-gnu` pin in `package.json` `optionalDependencies`; Rollup resolves its own platform binary and that pin should not exist.

P0-00 is now the first ticket in the roadmap and blocks every other verification gate.

Related, worth knowing: **CI does not build the site.** `.github/workflows/` runs content generation only; build and deploy are Cloudflare-side. The PR gate in D5 is therefore nominal until a build check is added (backlogged).

---

## D14 — Line endings normalized to LF
**2026-09** · *Roadmap P0-05*

79 files carried a pre-existing whitespace-only LF→CRLF conversion. Every acceptance gate in the roadmap is a grep or a diff, so this corrupted all of them. `.gitattributes` now pins `* text=auto eol=lf`.

---

## D15 — CLAUDE.md and ROADMAP.md live at repo root
**2026-09** · *Roadmap P0-04*

Claude Code auto-loads CLAUDE.md from repo root and `.claude/`, not from `docs/`. Placed in `docs/` it is inert, and every ticket prompt opening with "Read CLAUDE.md" silently loads nothing. DESIGN-TOKENS.md and DECISIONS.md stay in `docs/` — they are referenced explicitly, never auto-loaded.

---

## D16 — P0-01 withdrawn; `dist/` was never tracked
**2026-09**

The Sep 2026 recon reported `dist/` as committed. It was not — those 159 `pages.dev` hits were in git-ignored on-disk build output. `.gitignore` has covered `dist/` since before this work began. `wrangler.jsonc` does name `dist/` as a deploy input, but `package.json`'s "deploy" script regenerates it from source first: build artifact, not committed artifact.

Supersedes D12.

---

## D17 — Governance docs are excluded from string-based gates
**2026-09** · *Roadmap P0-07*

ROADMAP.md and DECISIONS.md quote the strings they document, so they match the greps they define. Gates exclude the docs; doc prose is never reworded to satisfy a gate.

---

## D18 — `--paper` and `--shadow` added to the canonical token file
**2026-09** · *Roadmap P1-01b*

`public/styles/tokens.css` now defines `--paper: #E8F4F5` and `--shadow: 0 18px 50px -18px rgba(0,0,0,.85)`, both copied verbatim from `docs/DESIGN-TOKENS.md` §2.

D8 and D10 list `--paper` and `--shadow` as canonical vocabulary and D10 calls `--white` "not an unmappable after all" — but P1-03 recon found neither token in the actual file. §4 maps `--white` (5 studies) → `--paper` and `--shadow` (signal, hbr) → `--shadow`, so the gap blocked P1-03, P1-04, P1-05, P1-07 and P1-09. Adding the two tokens closes it; the P1-01 additions group in the file now carries all six new names.

**Rules out:** re-deriving `--paper` / `--shadow` values per file. `docs/DESIGN-TOKENS.md` §2 is the source; alias blocks point at `var(--paper)` / `var(--shadow)`, never at a literal.

---

## Open

- **Canonical host** — P0-02 needs the answer: `workers.dev` or a custom domain? Blocks that ticket.
- **Light-mode mechanism** — `src/scripts/theme.ts` (dead, cookie + class) vs. the spec (`[data-theme]` + localStorage). P2-04 picks one.
- **`claude-3-5-haiku-20241022`** in `workers/chatbot-api/index.ts:100` — migrate alongside Sonnet, or leave?
- **Movies category** — filter the empty lane out of the homepage, or keep the empty state? P5-04.
