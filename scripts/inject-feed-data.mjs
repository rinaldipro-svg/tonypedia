/**
 * Post-build step (wired into the "build" npm script, not a lifecycle hook):
 *   astro build && node scripts/inject-feed-data.mjs
 *
 * Reads every src/content/feed/*.json (plain files — no astro:content import),
 * reassembles them into the array shape public/feed/index.html's render JS
 * expects, and injects a <script type="application/json" id="feed-data">
 * blob into dist/feed/index.html immediately before the page's data <script>.
 *
 * The page itself reads that blob via
 *   const ENTRIES = JSON.parse(document.getElementById('feed-data').textContent)
 * so there is no inline entry data left in the built HTML.
 *
 * Exits non-zero (failing the build) if the injection point can't be found,
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
const fail = (msg) => {
  console.error(`inject-feed-data: ${msg}`);
  process.exit(1);
};

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

// --- 3. sanity: the inline literal must be gone (STEP 4 applied) ---------
if (/const ENTRIES\s*=\s*\[/.test(html)) {
  fail('dist/feed/index.html still has an inline `const ENTRIES = [` literal — is public/feed/index.html reading from #feed-data?');
}

// --- 4. locate the consumer and the <script> that opens its block -------
const consumerIdx = html.indexOf(CONSUMER);
if (consumerIdx === -1) {
  fail(`consumer line not found in dist/feed/index.html:\n    ${CONSUMER}\n  Markup changed — aborting so stale content is not shipped.`);
}
const scriptOpen = html.lastIndexOf('<script>', consumerIdx);
if (scriptOpen === -1) fail('no `<script>` opening tag before the consumer line');

// --- 5. build the blob (escape "<" so nothing can break out of the tag) --
const json = JSON.stringify(entries).replace(/</g, '\\u003c');
const blob = `<script type="application/json" id="feed-data">${json}</script>\n`;

// --- 6. inject (idempotent: replace an existing blob if re-run) ---------
const existing = /<script type="application\/json" id="feed-data">[\s\S]*?<\/script>\n?/;
const before = html.slice(0, scriptOpen);
const out = existing.test(before)
  ? html.replace(existing, blob)
  : before + blob + html.slice(scriptOpen);

writeFileSync(DIST, out);
console.log(`inject-feed-data: injected ${entries.length} entries (${json.length} bytes) into dist/feed/index.html`);
