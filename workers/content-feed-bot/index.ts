import {
  CATEGORY_KEYS,
  type CategoryKey,
} from '../../src/shared/categories';

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_AUTHORIZED_USER_ID: string;
  ANTHROPIC_API_KEY: string;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
  GITHUB_WORKFLOW_TOKEN: string;
  GITHUB_REPO_OWNER: string;
  GITHUB_REPO_NAME: string;
  GITHUB_REPO_BRANCH?: string;
}

const AUDIENCES = ['Founders', 'Marketers', 'Developers', 'General', 'Other'] as const;
const TONES = ['Provocative', 'Educational', 'Data-driven', 'Conversational', 'Formal'] as const;
type Audience = (typeof AUDIENCES)[number];
type Tone = (typeof TONES)[number];

interface ParsedIdea {
  topic: string;
  angle: string;
  audience: Audience;
  tone: Tone;
  category: CategoryKey;
  reference_links: string | null;
  style_notes: string | null;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramMessageEntity {
  type: string;
  url?: string;
  offset: number;
  length: number;
}

interface TelegramUpdate {
  message?: {
    text?: string;
    caption?: string;
    photo?: TelegramPhotoSize[];
    entities?: TelegramMessageEntity[];
    caption_entities?: TelegramMessageEntity[];
    chat?: { id: number };
    from?: { id: number };
  };
}

interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

function notionHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getRichText(property: any): string {
  return (property?.rich_text ?? [])
    .map((entry: any) => entry?.plain_text ?? entry?.text?.content ?? '')
    .join('')
    .trim();
}

async function notionFetch<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Notion API error (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function queryDatabase(env: Env, payload: Record<string, unknown>): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let cursor: string | null = null;

  do {
    const response: NotionQueryResponse = await notionFetch<NotionQueryResponse>(
      `https://api.notion.com/v1/databases/${env.NOTION_DATABASE_ID}/query`,
      {
        method: 'POST',
        headers: notionHeaders(env),
        body: JSON.stringify({
          page_size: 100,
          ...payload,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      }
    );

    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return results;
}

async function updatePageStatus(env: Env, pageId: string, status: string): Promise<void> {
  await notionFetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: 'PATCH',
      headers: notionHeaders(env),
      body: JSON.stringify({
        properties: {
          Status: {
            select: { name: status },
          },
        },
      }),
    }
  );
}

async function sendTelegramMessage(env: Env, chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

async function triggerWorkflow(env: Env, workflowFileName: string): Promise<void> {
  const branch = env.GITHUB_REPO_BRANCH || 'main';
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/actions/workflows/${workflowFileName}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_WORKFLOW_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'tonypedia-content-feed-bot',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: branch }),
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${await response.text()}`);
  }
}

async function parseFreeformIdea(env: Env, text: string): Promise<ParsedIdea> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 3000,
      system: `You are a content brief parser for Tonypedia.

Return only valid JSON with this shape:
{
  "topic": "short article topic",
  "angle": "specific angle or hook",
  "audience": "one of: ${AUDIENCES.join(', ')}",
  "tone": "one of: ${TONES.join(', ')}",
  "category": "one of: ${CATEGORY_KEYS.join(', ')}",
  "reference_links": "single URL or null",
  "style_notes": "extra instructions or null"
}

Rules:
- Infer missing fields from context.
- Keep the topic under 80 characters.
- Return JSON only, with no code fences.`,
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const rawText = (data.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n')
    .replace(/```json|```/g, '')
    .trim();
  const parsed = JSON.parse(rawText) as Partial<ParsedIdea>;

  if (!parsed.topic || typeof parsed.topic !== 'string') {
    throw new Error('Parsed idea was missing a topic.');
  }

  const category = CATEGORY_KEYS.includes(parsed.category as CategoryKey)
    ? (parsed.category as CategoryKey)
    : 'tech';
  const audience = AUDIENCES.includes(parsed.audience as Audience)
    ? (parsed.audience as Audience)
    : 'General';
  const tone = TONES.includes(parsed.tone as Tone)
    ? (parsed.tone as Tone)
    : 'Conversational';

  return {
    topic: parsed.topic.trim(),
    angle: (parsed.angle ?? '').trim(),
    audience,
    tone,
    category,
    reference_links: parsed.reference_links ?? null,
    style_notes: parsed.style_notes ?? null,
  };
}

async function createNotionIdea(env: Env, text: string, parsed: ParsedIdea): Promise<number> {
  await notionFetch(
    'https://api.notion.com/v1/pages',
    {
      method: 'POST',
      headers: notionHeaders(env),
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DATABASE_ID },
        properties: {
          Topic: {
            title: [{ text: { content: parsed.topic } }],
          },
          Angle: {
            rich_text: parsed.angle ? [{ text: { content: parsed.angle } }] : [],
          },
          Audience: {
            select: { name: parsed.audience },
          },
          Tone: {
            select: { name: parsed.tone },
          },
          Category: {
            select: { name: parsed.category },
          },
          'Reference Links': parsed.reference_links ? { url: parsed.reference_links } : { url: null },
          'Raw Message': {
            rich_text: [{ text: { content: text } }],
          },
          'Style Notes': {
            rich_text: parsed.style_notes ? [{ text: { content: parsed.style_notes } }] : [],
          },
          'Automation Metadata': {
            rich_text: [],
          },
          Status: {
            select: { name: 'Ready' },
          },
        },
      }),
    }
  );

  const readyPages = await queryDatabase(env, {
    filter: {
      property: 'Status',
      select: { equals: 'Ready' },
    },
  });

  return readyPages.length;
}

async function handleStatusCommand(env: Env, chatId: number): Promise<Response> {
  const pages = await queryDatabase(env, {});
  const counts: Record<string, number> = {};

  for (const page of pages) {
    const status = page.properties.Status?.select?.name ?? 'Unknown';
    counts[status] = (counts[status] ?? 0) + 1;
  }

  const lines = ['Tonypedia queue status'];
  for (const status of ['Ready', 'Processing', 'Draft Sent', 'Approved', 'Published', 'Rejected']) {
    if (counts[status]) {
      lines.push(`${status}: ${counts[status]}`);
    }
  }
  lines.push(`Total: ${pages.length}`);

  await sendTelegramMessage(env, chatId, lines.join('\n'));
  return new Response('OK');
}

async function handlePublishCommand(env: Env, chatId: number): Promise<Response> {
  try {
    const pages = await queryDatabase(env, {});
    const counts: Record<string, number> = {};

    for (const page of pages) {
      const status = page.properties.Status?.select?.name ?? 'Unknown';
      counts[status] = (counts[status] ?? 0) + 1;
    }

    if ((counts.Processing ?? 0) > 0) {
      await sendTelegramMessage(
        env,
        chatId,
        `A content run is already in progress.\n\nProcessing: ${counts.Processing}`
      );
      return new Response('OK');
    }

    if ((counts['Draft Sent'] ?? 0) > 0) {
      await sendTelegramMessage(
        env,
        chatId,
        `You already have ${counts['Draft Sent']} draft batch item(s) waiting for approval.\n\nApprove them from the email link before publishing.`
      );
      return new Response('OK');
    }

    if ((counts.Approved ?? 0) > 0) {
      await triggerWorkflow(env, 'publish-approved.yml');
      await sendTelegramMessage(
        env,
        chatId,
        `Triggered Publish Approved Articles.\n\nApproved items queued for publish: ${counts.Approved}`
      );
      return new Response('OK');
    }

    if ((counts.Ready ?? 0) > 0) {
      await triggerWorkflow(env, 'generate-articles.yml');
      await sendTelegramMessage(
        env,
        chatId,
        `Triggered Generate Articles.\n\nReady items in queue: ${counts.Ready}\nYou will still receive the draft approval email before anything is published.`
      );
      return new Response('OK');
    }

    await sendTelegramMessage(
      env,
      chatId,
      'Nothing to publish right now.\n\nThere are no Ready or Approved items in the queue.'
    );
  } catch (error) {
    console.error(error);
    await sendTelegramMessage(
      env,
      chatId,
      'I could not trigger the publish flow right now. Check the worker GitHub secrets and try again.'
    );
  }

  return new Response('OK');
}

async function handleHelpCommand(env: Env, chatId: number): Promise<Response> {
  await sendTelegramMessage(
    env,
    chatId,
    'Send any article idea as a plain message and I will add it to the Tonypedia queue.\n\nCommands:\n/status\n/publish\n/help'
  );
  return new Response('OK');
}

// ───────────────────────────────────────────────────────────────────────────
// /feed — photo or forwarded-link intake → Sonnet 5 vision → feed-collection
// card committed to a branch, approved by merging that branch (D2: no Notion).
// ───────────────────────────────────────────────────────────────────────────

const FEED_CATS = ['concepts', 'tools', 'guides', 'prompts', 'industry', 'data'] as const;
type FeedCat = (typeof FEED_CATS)[number];

// Canonical per-category styling. `accent` mirrors `const CATS` in
// public/feed/index.html; `glow` is not on CATS, so these match the values
// existing src/content/feed/*.json entries use for each category. The model
// never picks these.
const CAT_ACCENT: Record<FeedCat, string> = {
  concepts: 'var(--sky)',
  tools: 'var(--amber)',
  guides: 'var(--acid)',
  prompts: 'var(--violet)',
  industry: 'var(--rose)',
  data: 'var(--green)',
};
const CAT_GLOW: Record<FeedCat, string> = {
  concepts: 'rgba(92,200,255,.12)',
  tools: 'rgba(255,122,47,.12)',
  guides: 'rgba(200,255,77,.1)',
  prompts: 'rgba(184,155,255,.12)',
  industry: 'rgba(255,111,145,.12)',
  data: 'rgba(111,220,140,.1)',
};

interface FeedCard {
  cat: FeedCat;
  title: string;
  source: string;
  blurb: string;
  size: 'col4';
  accent: string;
  glow: string;
  body: string;
  feature?: string;
  list?: string[];
  stat?: { n: string; label: string };
}

type ModelFeedCard = Omit<FeedCard, 'size' | 'accent' | 'glow'>;

/**
 * Structural validator for the model's feed-card JSON.
 *
 * KEEP IN SYNC with the `feed` collection schema in src/content/config.ts —
 * that file is the single source of truth. This is a hand-written mirror
 * because a Cloudflare Worker cannot import `astro:content` (see P4-02).
 *
 * accent / glow / size / table are REJECTED, not stripped: if the model
 * emits them the output is malformed per P4-04's intent.
 */
function validateFeedCard(obj: unknown): { ok: true; card: ModelFeedCard } | { ok: false; error: string } {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { ok: false, error: 'output is not a JSON object' };
  }
  const o = obj as Record<string, unknown>;

  for (const banned of ['accent', 'glow', 'size', 'table'] as const) {
    if (banned in o) {
      return { ok: false, error: `must not include "${banned}" — that field is assigned automatically, not by the model` };
    }
  }
  if (typeof o.cat !== 'string' || !(FEED_CATS as readonly string[]).includes(o.cat)) {
    return { ok: false, error: `"cat" must be one of: ${FEED_CATS.join(', ')}` };
  }
  for (const k of ['title', 'source', 'blurb', 'body'] as const) {
    if (typeof o[k] !== 'string' || (o[k] as string).trim() === '') {
      return { ok: false, error: `"${k}" must be a non-empty string` };
    }
  }
  if ('feature' in o && typeof o.feature !== 'string') {
    return { ok: false, error: '"feature" must be a string' };
  }
  if ('list' in o && (!Array.isArray(o.list) || (o.list as unknown[]).some((x) => typeof x !== 'string'))) {
    return { ok: false, error: '"list" must be an array of strings' };
  }
  if ('stat' in o) {
    const s = o.stat as Record<string, unknown> | null;
    if (typeof s !== 'object' || s === null || typeof s.n !== 'string' || typeof s.label !== 'string') {
      return { ok: false, error: '"stat" must be an object { "n": string, "label": string }' };
    }
  }
  const known = new Set(['cat', 'title', 'source', 'blurb', 'body', 'feature', 'list', 'stat']);
  for (const k of Object.keys(o)) {
    if (!known.has(k)) return { ok: false, error: `unexpected field "${k}"` };
  }

  return {
    ok: true,
    card: {
      cat: o.cat as FeedCat,
      title: (o.title as string).trim(),
      source: (o.source as string).trim(),
      blurb: (o.blurb as string).trim(),
      body: (o.body as string).trim(),
      ...(typeof o.feature === 'string' ? { feature: o.feature } : {}),
      ...(Array.isArray(o.list) ? { list: o.list as string[] } : {}),
      ...(o.stat ? { stat: o.stat as { n: string; label: string } } : {}),
    },
  };
}

function slugifyFeed(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Anthropic base64 image cap (~5 MB)

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function imageMediaType(pathOrUrl: string): string | null {
  const ext = (pathOrUrl.toLowerCase().split('?')[0].split('#')[0].split('.').pop() ?? '').trim();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return null;
}

async function telegramFileToBase64(
  env: Env,
  fileId: string
): Promise<{ data: string; mediaType: string } | { error: string }> {
  const metaRes = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  const meta = (await metaRes.json()) as { ok: boolean; result?: { file_path?: string; file_size?: number } };
  if (!meta.ok || !meta.result?.file_path) return { error: 'Telegram could not resolve that file' };

  const filePath = meta.result.file_path;
  const mediaType = imageMediaType(filePath);
  if (!mediaType) {
    return { error: `unsupported image type "${filePath.split('.').pop()}" — send a JPG or PNG` };
  }
  if (meta.result.file_size && meta.result.file_size > MAX_IMAGE_BYTES) {
    return { error: 'image is too large (max ~5 MB) — send a smaller version' };
  }

  const binRes = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`);
  const buf = new Uint8Array(await binRes.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) {
    return { error: 'image is too large (max ~5 MB) — send a smaller version' };
  }
  return { data: bytesToBase64(buf), mediaType };
}

function firstUrl(text: string, entities?: TelegramMessageEntity[]): string | null {
  if (entities) {
    for (const e of entities) {
      if (e.type === 'text_link' && e.url) return e.url;
    }
  }
  const m = text.match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0] : null;
}

async function scrapeOg(url: string): Promise<{ title?: string; description?: string; image?: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'tonypedia-content-feed-bot' } });
  const html = await res.text();
  const meta = (prop: string): string | undefined => {
    const a = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')
    );
    if (a) return a[1];
    const b = html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i')
    );
    return b ? b[1] : undefined;
  };
  let image = meta('og:image');
  if (image && !/^https?:\/\//i.test(image)) {
    try {
      image = new URL(image, url).href;
    } catch {
      image = undefined;
    }
  }
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  return {
    title: meta('og:title') ?? titleTag,
    description: meta('og:description') ?? meta('description'),
    image,
  };
}

async function generateFeedCardJson(
  env: Env,
  opts: { image?: { data: string; mediaType: string }; context: string }
): Promise<unknown> {
  const content: Array<Record<string, unknown>> = [];
  if (opts.image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: opts.image.mediaType, data: opts.image.data },
    });
  }
  content.push({
    type: 'text',
    text:
      `${opts.context}\n\n` +
      `Turn the material above into a single Tonypedia AI Feed card. Return ONLY a JSON object ` +
      `(no code fences, no commentary) with these fields:\n` +
      `- "cat": one of ${FEED_CATS.join(', ')}\n` +
      `- "title": short and punchy, <= 70 characters\n` +
      `- "source": where it came from (person, org, publication, "open source", etc.)\n` +
      `- "blurb": one or two plain-text sentences — the hook\n` +
      `- "body": the expanded explanation as HTML using only <p> <h4> <ul> <li> <code> <b>; ` +
      `end with <div class="srcline">SOURCE · ...</div>\n` +
      `Optionally include ONE of:\n` +
      `- "feature": a short string (only for a landmark concept)\n` +
      `- "list": an array of short strings (a bullet card instead of a blurb card)\n` +
      `- "stat": { "n": "95%", "label": "..." } for one headline number\n` +
      `Do NOT include "accent", "glow", "size", or "table" — those are assigned automatically.`,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const raw = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .replace(/```json|```/g, '')
    .trim();
  return JSON.parse(raw);
}

// GitHub API — same auth/header shape as triggerWorkflow().
async function githubFetch<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_WORKFLOW_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'tonypedia-content-feed-bot',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

async function feedSlugTaken(env: Env, branch: string, slug: string): Promise<boolean> {
  try {
    const items = await githubFetch<Array<{ name: string }>>(
      env,
      `/contents/src/content/feed?ref=${encodeURIComponent(branch)}`
    );
    return Array.isArray(items) && items.some((it) => it.name === `${slug}.json`);
  } catch {
    return false; // directory missing / empty ⇒ no collision
  }
}

async function commitFeedCardBranch(env: Env, card: FeedCard, slug: string, uuid: string): Promise<string> {
  const base = env.GITHUB_REPO_BRANCH || 'main';
  const branch = `feed/${uuid}`;

  const ref = await githubFetch<{ object: { sha: string } }>(env, `/git/ref/heads/${base}`);
  await githubFetch(env, '/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
  });

  const fileBody = JSON.stringify(card, null, 2) + '\n';
  await githubFetch(env, `/contents/src/content/feed/${slug}.json`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `feed: add "${card.title}"`,
      content: bytesToBase64(new TextEncoder().encode(fileBody)),
      branch,
    }),
  });

  return branch;
}

async function handleFeedCommand(
  env: Env,
  message: NonNullable<TelegramUpdate['message']>,
  baseUrl: string
): Promise<Response> {
  const chatId = message.chat!.id;
  const rawText = (message.text ?? message.caption ?? '').trim();
  const note = rawText.replace(/^\/feed\b/, '').trim();
  const entities = message.entities ?? message.caption_entities;

  try {
    let image: { data: string; mediaType: string } | undefined;
    const contextParts: string[] = [];

    if (message.photo && message.photo.length > 0) {
      const largest = message.photo[message.photo.length - 1];
      const r = await telegramFileToBase64(env, largest.file_id);
      if ('error' in r) {
        await sendTelegramMessage(env, chatId, `Couldn't use that photo: ${r.error}`);
        return new Response('OK');
      }
      image = r;
      contextParts.push('The user sent a screenshot (attached).');
    } else {
      const url = firstUrl(note, entities);
      if (!url) {
        await sendTelegramMessage(env, chatId, 'Send /feed with a photo attached, or `/feed <link>`.');
        return new Response('OK');
      }
      let og: { title?: string; description?: string; image?: string };
      try {
        og = await scrapeOg(url);
      } catch {
        await sendTelegramMessage(env, chatId, `Couldn't fetch that link.`);
        return new Response('OK');
      }
      if (!og.title && !og.description) {
        await sendTelegramMessage(env, chatId, `That link had no usable title or description — can't build a card from it.`);
        return new Response('OK');
      }
      contextParts.push(`Source URL: ${url}`);
      if (og.title) contextParts.push(`Page title: ${og.title}`);
      if (og.description) contextParts.push(`Page description: ${og.description}`);
      if (og.image) {
        const mt = imageMediaType(og.image);
        if (mt) {
          try {
            const imgRes = await fetch(og.image);
            const buf = new Uint8Array(await imgRes.arrayBuffer());
            if (buf.byteLength <= MAX_IMAGE_BYTES) image = { data: bytesToBase64(buf), mediaType: mt };
          } catch {
            /* proceed text-only */
          }
        }
      }
    }

    if (note) contextParts.push(`Note from the user: ${note}`);

    const rawCard = await generateFeedCardJson(env, { image, context: contextParts.join('\n') });
    const v = validateFeedCard(rawCard);
    if (!v.ok) {
      await sendTelegramMessage(
        env,
        chatId,
        `The generated card was rejected: ${v.error}\n\nNothing was committed. Try again or add a note.`
      );
      return new Response('OK');
    }

    const card: FeedCard = {
      ...v.card,
      size: 'col4',
      accent: CAT_ACCENT[v.card.cat],
      glow: CAT_GLOW[v.card.cat],
    };

    const uuid = crypto.randomUUID();
    const base = env.GITHUB_REPO_BRANCH || 'main';
    let slug = slugifyFeed(card.title) || `card-${uuid.slice(0, 8)}`;
    if (await feedSlugTaken(env, base, slug)) {
      slug = `${slug}-${uuid.slice(0, 4)}`;
    }

    const branch = await commitFeedCardBranch(env, card, slug, uuid);
    const approveUrl = `${baseUrl}/approve/feed/${uuid}`;

    await sendTelegramMessage(
      env,
      chatId,
      `Feed card generated — pending approval.\n\n` +
        `Title: ${card.title}\nCategory: ${card.cat}\nFile: src/content/feed/${slug}.json\nBranch: ${branch}\n\n` +
        `Approve (merges to ${base} and redeploys):\n${approveUrl}`
    );
  } catch (error) {
    console.error(error);
    await sendTelegramMessage(env, chatId, `Something went wrong building that feed card. Nothing was committed.`);
  }

  return new Response('OK');
}

function approvalPage(title: string, bodyHtml: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html><body style="font-family: sans-serif; text-align: center; padding: 64px;">` +
      `<h1>${title}</h1>${bodyHtml}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function handleFeedApproval(env: Env, uuid: string): Promise<Response> {
  const base = env.GITHUB_REPO_BRANCH || 'main';
  const branch = `feed/${uuid}`;

  try {
    await githubFetch(env, '/merges', {
      method: 'POST',
      body: JSON.stringify({ base, head: branch, commit_message: `feed: approve ${branch}` }),
    });
  } catch (error) {
    const msg = String((error as Error).message);
    if (msg.includes('failed (409)')) {
      return approvalPage(
        'Merge conflict',
        `<p>Branch <code>${branch}</code> conflicts with <code>${base}</code> and can't be merged automatically. Resolve it by hand.</p>`,
        409
      );
    }
    if (msg.includes('failed (404)')) {
      return approvalPage(
        'Nothing to approve',
        `<p>Branch <code>${branch}</code> was not found — it may already have been merged.</p>`,
        404
      );
    }
    console.error(error);
    return approvalPage(
      'Approval failed',
      `<p>Could not merge <code>${branch}</code>. Check the worker logs.</p>`,
      502
    );
  }

  return approvalPage(
    'Feed card approved',
    `<p>Branch <code>${branch}</code> merged into <code>${base}</code>.</p>` +
      `<p>Cloudflare will redeploy from the push.</p>`
  );
}

async function handleTelegram(env: Env, request: Request): Promise<Response> {
  const body = (await request.json()) as TelegramUpdate;
  const message = body.message;

  if (!message?.chat?.id || !message.from?.id) {
    return new Response('OK');
  }

  if (String(message.from.id) !== env.TELEGRAM_AUTHORIZED_USER_ID) {
    return new Response('OK');
  }

  const text = (message.text ?? message.caption ?? '').trim();
  const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;

  if (!text && !hasPhoto) {
    return new Response('OK');
  }

  if (text === '/status') {
    return handleStatusCommand(env, message.chat.id);
  }

  if (text === '/publish') {
    return handlePublishCommand(env, message.chat.id);
  }

  if (text === '/help') {
    return handleHelpCommand(env, message.chat.id);
  }

  if (text.startsWith('/feed')) {
    return handleFeedCommand(env, message, new URL(request.url).origin);
  }

  if (hasPhoto) {
    await sendTelegramMessage(
      env,
      message.chat.id,
      'To turn a photo into a Feed card, send it with the caption `/feed`.'
    );
    return new Response('OK');
  }

  const hubText = text.startsWith('/hub ') ? text.slice('/hub '.length).trim() : text;
  if (!hubText) {
    return new Response('OK');
  }

  try {
    const parsed = await parseFreeformIdea(env, hubText);
    const readyCount = await createNotionIdea(env, hubText, parsed);

    await sendTelegramMessage(
      env,
      message.chat.id,
      `Added to feed\n\nTopic: ${parsed.topic}\nCategory: ${parsed.category}\nAudience: ${parsed.audience}\nTone: ${parsed.tone}\nReady queue: ${readyCount}`
    );
  } catch (error) {
    await sendTelegramMessage(
      env,
      message.chat.id,
      "I couldn't parse that idea cleanly. Try a message like: Why most startups fail at content marketing, aimed at founders, keep it provocative."
    );
    console.error(error);
  }

  return new Response('OK');
}

async function handleApproval(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const batchId = url.pathname.replace('/approve/', '');

  if (!/^[a-f0-9-]{36}$/i.test(batchId)) {
    return new Response('Invalid approval link.', { status: 400 });
  }

  const draftSentPages = await queryDatabase(env, {
    filter: {
      property: 'Status',
      select: { equals: 'Draft Sent' },
    },
  });

  let approvedCount = 0;

  for (const page of draftSentPages) {
    const metadataText = getRichText(page.properties['Automation Metadata']);

    if (!metadataText) {
      continue;
    }

    try {
      const metadata = JSON.parse(metadataText) as { batchId?: string };
      if (metadata.batchId === batchId) {
        await updatePageStatus(env, page.id, 'Approved');
        approvedCount += 1;
      }
    } catch {
      continue;
    }
  }

  return new Response(
    `<!DOCTYPE html><html><body style="font-family: sans-serif; text-align: center; padding: 64px;">
<h1>Tonypedia batch approved</h1>
<p>${approvedCount} article(s) were marked Approved.</p>
<p>The publish workflow will pick them up on its next run.</p>
</body></html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/telegram') {
      return handleTelegram(env, request);
    }

    if (request.method === 'GET' && url.pathname.startsWith('/approve/feed/')) {
      const uuid = url.pathname.slice('/approve/feed/'.length);
      if (!/^[a-f0-9-]{36}$/i.test(uuid)) {
        return new Response('Invalid approval link.', { status: 400 });
      }
      return handleFeedApproval(env, uuid);
    }

    if (request.method === 'GET' && url.pathname.startsWith('/approve/')) {
      return handleApproval(env, request);
    }

    return new Response('Not found', { status: 404 });
  },
};
