import { getCollection } from 'astro:content';

// On-demand route: the chatbot needs the request body and the Anthropic
// secret at runtime, so it must not be prerendered. astro.config.mjs stays
// output: 'static' — only this route opts into SSR.
export const prerender = false;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface IndexedArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  url: string;
  content: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(context: any): Promise<Response> {
  try {
    const { message, history } = (await context.request.json()) as {
      message: string;
      history: Message[];
    };

    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'Invalid message' }, 400);
    }

    // Same-origin: the RAG corpus is this site's own content, so build it
    // directly from the collection instead of fetching /search-index.json
    // over HTTP (which is what the standalone worker's SITE_URL was for).
    // Mirrors src/pages/search-index.json.ts.
    const articles: IndexedArticle[] = (
      await getCollection('articles', ({ data }) => !data.draft)
    ).map((article) => ({
      slug: article.slug,
      title: article.data.title,
      description: article.data.description,
      category: article.data.category,
      tags: article.data.tags,
      url: `/articles/${article.slug}`,
      content: article.body?.slice(0, 2000) || '',
    }));

    // Keyword matching: split message into words, score articles
    const keywords = message
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const relevant = articles
      .map((a) => ({
        ...a,
        score: keywords.filter((k) => {
          const titleMatch = a.title.toLowerCase().includes(k);
          const descMatch = a.description.toLowerCase().includes(k);
          const contentMatch = a.content.toLowerCase().includes(k);
          const tagMatch = a.tags.some((t) => t.toLowerCase().includes(k));

          return titleMatch || descMatch || contentMatch || tagMatch;
        }).length,
      }))
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Build context for Claude
    const contextText =
      relevant.length > 0
        ? relevant
            .map((a) => `**Article: "${a.title}"** (${a.url})\n${a.content}`)
            .join('\n\n---\n\n')
        : 'No matching articles found in the knowledge base.';

    const apiKey = context.locals.runtime.env.ANTHROPIC_API_KEY;

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        system: `You are Tonypedia AI, the friendly assistant for the Tonypedia knowledge hub.
Answer questions using ONLY the provided article content.
Always cite which article your information comes from by title and link.
Keep answers concise (under 200 words). Be friendly and engaging.
If you don't have enough information to answer the question, say so and suggest the user explore the site.`,
        messages: [
          ...(history ?? []).slice(-5),
          {
            role: 'user' as const,
            content: `Based on these articles:\n\n${contextText}\n\nAnswer this question: ${message}`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const error = await claudeRes.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = (await claudeRes.json()) as any;

    const responseText =
      data.content && data.content[0] && data.content[0].text
        ? data.content[0].text
        : 'I encountered an error processing your request. Please try again.';

    return jsonResponse({
      response: responseText,
      sources: relevant.slice(0, 3).map((a) => ({
        title: a.title,
        url: a.url,
      })),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return jsonResponse(
      {
        error: 'An error occurred processing your request.',
        response: 'Sorry, I encountered an error. Please try again later.',
        sources: [],
      },
      500
    );
  }
}
