# CLAUDE.md — Tonypedia

Standing instructions for Claude Code. Loaded automatically. Keep this short; past ~150 lines it stops being read carefully.

**Rev 2** — corrected against the Sep 2026 repo recon.

---

## Project

A personal knowledge hub: **Hub** (long-form articles), **AI Feed** (a living AI knowledge base), **Deep Dives** (research studies). Astro 5 static + `@astrojs/cloudflare`, Tailwind, MDX.

Work is tracked in `ROADMAP.md`. Tokens in `docs/DESIGN-TOKENS.md`. Decisions and rationale in `docs/DECISIONS.md`.

---

## The one rule that matters

**Read the file before you edit it. Use the class names and variable names that are actually there.**

This repo has a documented history of specs diverging from reality. Roadmap Rev 1 was written from the live site and was wrong about file paths, redirect directions, the token vocabulary, and the `og:image` failure mode. **When a ticket and a file disagree, the file is right.**

When a ticket says "read X first and report the actual names," that is load-bearing. Report *before* editing.

**An unmapped token or an ambiguous class name is a finding, not a blocker.** Report it and stop. Do not guess, do not invent a token, do not pick the closest-looking match.

---

## Token discipline

- **One ticket per session.** `/clear` between tickets.
- **Never load the repo wide.** Tickets name their files; read those. If a ticket needs a file it doesn't name, that's a ticket bug — report it.
- **Grep-report before edit-sweep.** For repo-wide renames: run the grep, report the hits, then edit. Do not interleave.
- **Do not read `ROADMAP.md` to execute a ticket.** Tickets are self-contained by design.
- Prefer `str_replace` over rewriting whole files.

---

## Repo map (verified)

```
astro.config.mjs              site: (fix in P0-02), output static, cloudflare adapter
tailwind.config.mjs           content: ./src/**/* ONLY — does not scan public/
src/layouts/BaseLayout.astro  title/description/ogImage props; Google Fonts link
src/layouts/ArticleLayout.astro  wraps BaseLayout; X share (:68); related-articles stub
src/styles/global.css         @import of tokens.css, then tailwind directives
src/styles/tokens.css         → moves to public/styles/tokens.css in P1-01
src/content/config.ts         studies (:21-32), feed (:34-46)
src/content/feed/             DOES NOT EXIST — collection defined but unused
src/components/Navbar.astro   3 nav renderings, one shared `sections` array
src/components/Footer.astro   a 4TH nav rendering with its OWN sections array
src/pages/feed.astro          currently redirects /feed/ → /signal/ (backwards)
src/pages/studies/[slug].astro:16  redirects clean-slug → .html (backwards)
src/scripts/theme.ts          exists, imported NOWHERE, cookie+class mechanism
public/signal/index.html      the AI Feed page (a directory index, not a flat file)
public/studies/*.html         8 standalone studies (not 7 — hbr-* is easy to miss)
src/pages/api/chat.ts         chatbot endpoint (on-demand route; needs ANTHROPIC_API_KEY secret)
scripts/content-agent/        the /hub pipeline
workers/content-feed-bot/     the Telegram bot
```

There is no `_redirects` file and no `redirects:` config. **The redirect mechanism is per-page `Astro.redirect(…, 301)`.** Use it.

---

## Architectural constraints

Decided deliberately. Do not re-litigate mid-ticket.

- **No `--tp-*` prefix.** The canonical vocabulary is the existing un-prefixed one (`--bg`, `--ink`, `--amber`). Rev 1 proposed a prefix; it was withdrawn (D8).
- **Do not rebuild the AI Feed page in Astro.** It stays a standalone directory-index HTML file. Evaluated and rejected as a fidelity downgrade (D6).
- **`htmlFile` frontmatter is the single source of truth** for study slug↔filename. `[slug].astro` already honours it. Do not build a second map (D7).
- **After P1, no file declares its own `:root` colour values.** Standalone files carry alias blocks only. A literal hex in a `:root` outside `public/styles/tokens.css` is a bug.
- **Do not widen Tailwind's content glob to `public/`.** The CSS-variable indirection is the bridge; JIT class generation is not needed there.
- **Nav changes touch FOUR places:** three renderings in `Navbar.astro` (they share one array, so usually one edit) plus `Footer.astro`'s separate array.

---

## Git

- Conventional commits: `feat:` `fix:` `refactor:` `style:` `docs:` `chore:`.
- **No co-author trailers. No "Generated with" footers.** Authorship is Tony / rinaldipro-svg only.
- Branch per phase: `phase/p2-palette`. One PR per phase, squash-merged to `main`.
- The P1 alias tickets are explicitly one commit per file. Do not batch them.
- `dist/` is untracked as of P0-01. Never re-add it.

---

## Verification

```bash
npm run build        # must be clean
npx astro check      # must pass
```

Then the ticket's own acceptance criterion — usually a grep against a **fresh** `dist/`.

Visual checks at **390px** and **1440px**.

⚠️ Both commands fail until **P0-00** lands (platform-mismatched `node_modules`). Until then, no acceptance gate in the roadmap is runnable.

---

## Reporting back

1. Commit hash(es).
2. Divergences — actual names/paths found vs. what the ticket described.
3. Anything unmapped, unresolved, or unverified.

Skip summarizing what the ticket said. Tony wrote it.

---

## Known traps

- **`IntersectionObserver` scroll-reveal fails silently** when a standalone HTML file is opened from a mobile filesystem. Any reveal system needs a `setTimeout` fallback, feature detection, and a `<noscript>` CSS block.
- **PDF export from these dark files** needs: Google Fonts links removed, `min-height: 100vh` stripped from heroes, reveal elements forced visible, `print-color-adjust: exact`.
- **`--bg` vs `--panel` is a 1.11:1 step.** Cards merge on cheap phone panels. Fix with `--line` borders, never by lightening surfaces.
- **`--amber` means two different colours** in this repo — primary orange in `tokens.css`, gold in four studies. See `docs/DESIGN-TOKENS.md` §4. Most error-prone mapping in P1.
- **CI does not build the site.** `.github/workflows/` runs content generation only. A green CI badge does not mean the site compiles.
