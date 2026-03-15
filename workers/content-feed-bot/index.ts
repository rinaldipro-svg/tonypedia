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

interface TelegramUpdate {
  message?: {
    text?: string;
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
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

async function handleTelegram(env: Env, request: Request): Promise<Response> {
  const body = (await request.json()) as TelegramUpdate;
  const message = body.message;

  if (!message?.text || !message.chat?.id || !message.from?.id) {
    return new Response('OK');
  }

  if (String(message.from.id) !== env.TELEGRAM_AUTHORIZED_USER_ID) {
    return new Response('OK');
  }

  const text = message.text.trim();

  if (text === '/status') {
    return handleStatusCommand(env, message.chat.id);
  }

  if (text === '/publish') {
    return handlePublishCommand(env, message.chat.id);
  }

  if (text === '/help') {
    return handleHelpCommand(env, message.chat.id);
  }

  try {
    const parsed = await parseFreeformIdea(env, text);
    const readyCount = await createNotionIdea(env, text, parsed);

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

    if (request.method === 'GET' && url.pathname.startsWith('/approve/')) {
      return handleApproval(env, request);
    }

    return new Response('Not found', { status: 404 });
  },
};
