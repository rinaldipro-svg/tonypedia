/**
 * Post-build step (wired into the "build" npm script, not a lifecycle hook):
 *   astro build && node scripts/inject-feed-data.mjs
 *
 * Reads every src/content/feed/*.json (plain files — no astro:content import)
 * and, in one write pass, does two injections into dist/feed/index.html:
 *
 *   1. A <script type="application/json" id="feed-data"> blob with all 30
 *      entries, immediately before the page's data <script>. The page reads it
 *      via  const ENTRIES = JSON.parse(document.getElementById('feed-data').textContent)
 *      so no entry data is left inline in the built HTML.
 *
 *   2. Server-rendered fallback cards into <main id="main">, so crawlers and
 *      no-JS visitors see real <article class="card"> markup. On load the page's
 *      render() overwrites #main wholesale with identical JS-built cards, so
 *      these are only ever seen without JS.
 *
 * Exits non-zero (failing the build) if either injection point can't be found,
 * so a future markup change breaks loudly instead of shipping stale content.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FEED_DIR = join(root, 'src/content/feed');
const DIST = join(root, 'dist/feed/index.html');

// Key order the page's render JS reads; keep output stable & minimal.
const KEY_ORDER = ['cat', 'title', 'source', 'blurb', 'size', 'accent', 'glow', 'body', 'feature', 'list', 'stat', 'table'];
// The load-bearing bit of public/feed/index.html's ENTRIES loader. Stable
// whether or not the dev-fallback wrapper is present.
const CONSUMER = "document.getElementById('feed-data')";

// id -> display name, mirrors `const CATS` in public/feed/index.html.
// KEEP IN SYNC if that array's ids or names ever change.
const CAT_NAMES = {
  concepts: 'Foundations',
  tools: 'Tools & Stack',
  guides: 'Playbooks',
  prompts: 'Prompts',
  industry: 'Market Moves',
  data: 'Benchmarks',
};
const CAT_ORDER = ['concepts', 'tools', 'guides', 'prompts', 'industry', 'data'];

const fail = (msg) => {
  console.error(`inject-feed-data: ${msg}`);
  process.exit(1);
};

// Minimal HTML-text/attribute escaper (the script had none — the JSON blob
// uses a JSON-string < escape, which is not HTML escaping).
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// --- 1. gather entries (sorted by filename for deterministic output) ------
const files = readdirSync(FEED_DIR).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) fail(`no *.json files in ${FEED_DIR}`);
const entries = files.map((f) => {
  const raw = JSON.parse(readFileSync(join(FEED_DIR, f), 'utf8'));
  const ordered = {};
  for (const k of KEY_ORDER) if (raw[k] !== undefined) ordered[k] = raw[k];
  return ordered;
});

// --- 2. read the built page --------------------------------------------
let html;
try {
  html = readFileSync(DIST, 'utf8');
} catch {
  fail(`${DIST} not found — run "astro build" first`);
}

// --- 3. sanity: the inline literal must be gone (client reads #feed-data) --
if (/const ENTRIES\s*=\s*\[/.test(html)) {
  fail('dist/feed/index.html still has an inline `const ENTRIES = [` literal — is public/feed/index.html reading from #feed-data?');
}

// --- 4. injection A: the JSON data blob --------------------------------
const consumerIdx = html.indexOf(CONSUMER);
if (consumerIdx === -1) {
  fail(`consumer line not found in dist/feed/index.html:\n    ${CONSUMER}\n  Markup changed — aborting so stale content is not shipped.`);
}
const scriptOpen = html.lastIndexOf('<script>', consumerIdx);
if (scriptOpen === -1) fail('no `<script>` opening tag before the consumer line');

// escape "<" so nothing in a `body` string can break out of the script tag
const json = JSON.stringify(entries).replace(/</g, '\\u003c');
const blob = `<script type="application/json" id="feed-data">${json}</script>\n`;

const blobRe = /<script type="application\/json" id="feed-data">[\s\S]*?<\/script>\n?/;
if (blobRe.test(html.slice(0, scriptOpen))) {
  html = html.replace(blobRe, blob); // idempotent on re-run
} else {
  html = html.slice(0, scriptOpen) + blob + html.slice(scriptOpen);
}

// --- 5. injection B: server-rendered fallback cards ------------------
// Card inner content mirrors cardHTML() in public/feed/index.html; table-type
// and feature-type entries fall back to title + blurb only (no table rows,
// no feature block). No `.reveal` class — these must be visible without JS.
const cardHtml = (e, i) => {
  const name = esc(CAT_NAMES[e.cat] ?? e.cat);
  const plain = e.table || e.feature;
  let inner;
  if (!plain && e.stat) {
    inner = `<div class="bignum">${esc(e.stat.n)}</div><p>${esc(e.stat.label)}</p>`;
  } else if (!plain && Array.isArray(e.list)) {
    inner = `<ul class="mini">${e.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
  } else {
    inner = `<p>${esc(e.blurb)}</p>`;
  }
  return (
    `<article class="card ${esc(e.size || 'col4')}" data-i="${i}" data-cat="${esc(e.cat)}" ` +
    `style="--accent:${esc(e.accent)};--glow:${esc(e.glow)}">` +
    `<div class="card-tag"><span class="bar"></span>${name}</div>` +
    `<h3>${esc(e.title)}</h3>` +
    inner +
    `<div class="meta"><span class="src"><span class="d"></span>${esc(e.source)}</span></div>` +
    `</article>`
  );
};

// data-i must be the entry's index in the #feed-data array (same `entries`,
// same order); grouping by category must not renumber.
const indexed = entries.map((e, i) => ({ e, i }));
const sections = CAT_ORDER.map((id) => {
  const group = indexed.filter((o) => o.e.cat === id);
  if (group.length === 0) return '';
  return (
    `<section class="cat" id="cat-${id}" data-cat="${id}">` +
    group.map((o) => cardHtml(o.e, o.i)).join('') +
    `</section>`
  );
}).join('');

const mainRe = /<main id="main">[\s\S]*?<\/main>/;
if (!mainRe.test(html)) fail('`<main id="main">…</main>` not found in dist/feed/index.html');
const mainBlock = `<main id="main">${sections}</main>`;
html = html.replace(mainRe, mainBlock);

// --- 6. one write pass ----------------------------------------------
writeFileSync(DIST, html);

// count within the injected <main> only (the page's <script> also contains the
// literal strings "<article class=\"card" / "<section class=\"cat\"")
const articleCount = (mainBlock.match(/<article class="card /g) || []).length;
const sectionCount = (mainBlock.match(/<section class="cat"/g) || []).length;
console.log(
  `inject-feed-data: injected ${entries.length} entries (${json.length} bytes) into #feed-data; ` +
    `server-rendered ${articleCount} <article class="card"> across ${sectionCount} <section class="cat"> in <main>`
);
