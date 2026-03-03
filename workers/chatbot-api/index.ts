interface Env {
  ANTHROPIC_API_KEY: string;
  SITE_URL?: string;
}

interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  url: string;
  content: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const { message, history } = await request.json() as {
        message: string;
        history: Message[];
      };

      if (!message || typeof message !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid message' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch search index from deployed site
      const siteUrl = env.SITE_URL || 'https://tonypedia.pages.dev';
      const indexRes = await fetch(`${siteUrl}/search-index.json`);

      if (!indexRes.ok) {
        throw new Error('Failed to fetch search index');
      }

      const articles: Article[] = await indexRes.json();

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
      const context =
        relevant.length > 0
          ? relevant
              .map((a) => `**Article: "${a.title}"** (${a.url})\n${a.content}`)
              .join('\n\n---\n\n')
          : 'No matching articles found in the knowledge base.';

      // Call Claude API
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          system: `You are Tonypedia AI, the friendly assistant for the Tonypedia knowledge hub. 
Answer questions using ONLY the provided article content. 
Always cite which article your information comes from by title and link.
Keep answers concise (under 200 words). Be friendly and engaging.
If you don't have enough information to answer the question, say so and suggest the user explore the site.`,
          messages: [
            ...history.slice(-5),
            {
              role: 'user' as const,
              content: `Based on these articles:\n\n${context}\n\nAnswer this question: ${message}`,
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

      return new Response(
        JSON.stringify({
          response: responseText,
          sources: relevant.slice(0, 3).map((a) => ({
            title: a.title,
            url: a.url,
          })),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      return new Response(
        JSON.stringify({
          error: 'An error occurred processing your request.',
          response: 'Sorry, I encountered an error. Please try again later.',
          sources: [],
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
