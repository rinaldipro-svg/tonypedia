import type { AutomationMetadata, CategoryKey, NotionArticleBrief } from './contracts.js';
import { CATEGORY_KEYS } from './contracts.js';
import { safeJsonParse, stripPriorityPrefix } from './utils.js';

interface NotionPage {
  id: string;
  created_time?: string;
  last_edited_time?: string;
  properties: Record<string, any>;
}

interface QueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

function notionHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };
}

async function notionFetch<T>(input: string, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Notion API error (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function queryDatabase(
  apiKey: string,
  databaseId: string,
  payload: Record<string, unknown>
): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let cursor: string | null = null;

  do {
    const response: QueryResponse = await notionFetch<QueryResponse>(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: notionHeaders(apiKey),
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

function getTitle(property: any): string {
  return (property?.title ?? [])
    .map((entry: any) => entry?.plain_text ?? entry?.text?.content ?? '')
    .join('')
    .trim();
}

function getRichText(property: any): string {
  return (property?.rich_text ?? [])
    .map((entry: any) => entry?.plain_text ?? entry?.text?.content ?? '')
    .join('')
    .trim();
}

function getSelect(property: any): string {
  return property?.select?.name?.trim?.() ?? '';
}

function getUrl(property: any): string {
  return property?.url?.trim?.() ?? '';
}

function parseCategory(value: string): CategoryKey {
  if (CATEGORY_KEYS.includes(value as CategoryKey)) {
    return value as CategoryKey;
  }

  throw new Error(`Unsupported category "${value}" on Notion row.`);
}

function parseAutomationMetadata(page: NotionPage): AutomationMetadata {
  const raw = getRichText(page.properties['Automation Metadata']);
  return raw ? safeJsonParse<AutomationMetadata>(raw, {}) : {};
}

export function toBrief(page: NotionPage): NotionArticleBrief {
  const category = parseCategory(getSelect(page.properties.Category));
  const referenceLink = getUrl(page.properties['Reference Links']);

  return {
    pageId: page.id,
    topic: getTitle(page.properties.Topic),
    angle: getRichText(page.properties.Angle),
    audience: (getSelect(page.properties.Audience) || 'General') as NotionArticleBrief['audience'],
    tone: (getSelect(page.properties.Tone) || 'Conversational') as NotionArticleBrief['tone'],
    referenceLinks: referenceLink ? [referenceLink] : [],
    rawMessage: getRichText(page.properties['Raw Message']),
    styleNotes: getRichText(page.properties['Style Notes']),
    category,
    status: getSelect(page.properties.Status),
    automationMetadata: parseAutomationMetadata(page),
    publishedUrl: getUrl(page.properties['Published URL']) || undefined,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
}

export async function getReadyBriefs(
  apiKey: string,
  databaseId: string,
  limit: number
): Promise<NotionArticleBrief[]> {
  const pages = await queryDatabase(apiKey, databaseId, {
    filter: {
      property: 'Status',
      select: { equals: 'Ready' },
    },
    sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
  });

  return pages
    .map(toBrief)
    .sort((left, right) => {
      const leftPriority = left.topic !== stripPriorityPrefix(left.topic) ? 0 : 1;
      const rightPriority = right.topic !== stripPriorityPrefix(right.topic) ? 0 : 1;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(left.createdTime ?? 0).getTime() - new Date(right.createdTime ?? 0).getTime();
    })
    .slice(0, limit);
}

export async function getApprovedBriefs(
  apiKey: string,
  databaseId: string
): Promise<NotionArticleBrief[]> {
  const pages = await queryDatabase(apiKey, databaseId, {
    filter: {
      property: 'Status',
      select: { equals: 'Approved' },
    },
    sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
  });

  return pages.map(toBrief);
}

export async function getPublishedBriefsSince(
  apiKey: string,
  databaseId: string,
  isoTimestamp: string
): Promise<NotionArticleBrief[]> {
  const pages = await queryDatabase(apiKey, databaseId, {
    filter: {
      and: [
        {
          property: 'Status',
          select: { equals: 'Published' },
        },
        {
          timestamp: 'last_edited_time',
          last_edited_time: { on_or_after: isoTimestamp },
        },
      ],
    },
    sorts: [{ timestamp: 'last_edited_time', direction: 'ascending' }],
  });

  return pages.map(toBrief);
}

export async function getQueueStats(
  apiKey: string,
  databaseId: string
): Promise<Record<string, number>> {
  const pages = await queryDatabase(apiKey, databaseId, {});
  const stats: Record<string, number> = {};

  for (const page of pages) {
    const status = getSelect(page.properties.Status) || 'Unknown';
    stats[status] = (stats[status] ?? 0) + 1;
  }

  return stats;
}

export async function updatePageStatus(
  apiKey: string,
  pageId: string,
  status: string,
  options: {
    automationMetadata?: AutomationMetadata;
    publishedUrl?: string;
  } = {}
): Promise<void> {
  const properties: Record<string, unknown> = {
    Status: {
      select: { name: status },
    },
  };

  if (options.automationMetadata) {
    properties['Automation Metadata'] = {
      rich_text: [
        {
          text: {
            content: JSON.stringify(options.automationMetadata),
          },
        },
      ],
    };
  }

  if (options.publishedUrl) {
    properties['Published URL'] = { url: options.publishedUrl };
  }

  await notionFetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: 'PATCH',
      headers: notionHeaders(apiKey),
      body: JSON.stringify({ properties }),
    }
  );
}
