import type { GeneratedArticle, NotionArticleBrief } from './contracts.js';
import { CATEGORY_KEYS } from './contracts.js';
import {
  estimateReadingTime,
  normalizeDescription,
  normalizeTags,
  sanitizeBodyMarkdown,
} from './utils.js';

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string; input?: Partial<GeneratedArticle> }>;
  stop_reason?: string;
}

function getResponseText(response: AnthropicResponse): string {
  return (response.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export async function generateArticle(
  apiKey: string,
  killerPrompt: string,
  brief: NotionArticleBrief
): Promise<GeneratedArticle> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 16000,
      system: `${killerPrompt}

Deliver the article by calling submit_article.

Rules:
- The markdown body must start with the opening paragraph or an H2 heading. Do not include an H1 title.
- Do not include frontmatter.
- Keep the description punchy and under 200 characters.
- Use 3-7 tags.`,
      tools: [
        {
          name: 'submit_article',
          description: 'Submit the finished article.',
          input_schema: {
            type: 'object',
            required: ['title', 'description', 'tags', 'body_markdown', 'category', 'reading_time'],
            properties: {
              title: { type: 'string' },
              description: { type: 'string', maxLength: 200 },
              tags: { type: 'array', items: { type: 'string' } },
              body_markdown: { type: 'string' },
              category: { type: 'string', enum: [...CATEGORY_KEYS] },
              reading_time: { type: 'integer' },
            },
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_article' },
      messages: [
        {
          role: 'user',
          content: `Write a publication-ready Tonypedia article from this brief.

Topic: ${brief.topic}
Category: ${brief.category}
Angle: ${brief.angle || 'Use the strongest defensible angle for the topic.'}
Audience: ${brief.audience}
Tone: ${brief.tone}
Reference Links: ${brief.referenceLinks.join(', ') || 'None provided'}
Style Notes: ${brief.styleNotes || 'No extra notes'}
Original Telegram Message: ${brief.rawMessage || 'Not available'}

The article should be 800-1500 words, analytically strong, and readable for a smart general audience.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const toolUse = (data.content ?? []).find((block) => block.type === 'tool_use');
  const parsed = toolUse?.input ?? {};
  const bodyMarkdown = sanitizeBodyMarkdown(parsed.body_markdown ?? '');

  if (!toolUse || !bodyMarkdown) {
    throw new Error(
      `Anthropic response did not include a submit_article body (stop_reason: ${data.stop_reason ?? 'unknown'}). Text: ${getResponseText(data).slice(0, 300)}`
    );
  }

  const title = (parsed.title ?? brief.topic).trim();
  const description = normalizeDescription(parsed.description ?? '', bodyMarkdown);
  const tags = normalizeTags(parsed.tags);
  const readingTime =
    typeof parsed.reading_time === 'number' && Number.isFinite(parsed.reading_time)
      ? Math.max(1, Math.round(parsed.reading_time))
      : estimateReadingTime(bodyMarkdown);
  const suggestedCategory = CATEGORY_KEYS.includes(parsed.category as GeneratedArticle['category'])
    ? (parsed.category as GeneratedArticle['category'])
    : brief.category;

  return {
    title,
    description,
    tags,
    body_markdown: bodyMarkdown,
    category: suggestedCategory,
    reading_time: readingTime,
  };
}
