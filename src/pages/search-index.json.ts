import { getCollection } from 'astro:content';

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => !data.draft);

  const index = articles.map((article) => ({
    slug: article.slug,
    title: article.data.title,
    description: article.data.description,
    category: article.data.category,
    tags: article.data.tags,
    author: article.data.author,
    pubDate: article.data.pubDate.toISOString(),
    url: `/articles/${article.slug}`,
    content: article.body?.slice(0, 2000) || '',
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
