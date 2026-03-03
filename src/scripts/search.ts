export interface SearchArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  pubDate: string;
  url: string;
  content: string;
}

let searchIndex: SearchArticle[] = [];

export async function loadSearchIndex(): Promise<SearchArticle[]> {
  if (searchIndex.length > 0) return searchIndex;

  try {
    const response = await fetch('/search-index.json');
    if (!response.ok) throw new Error('Failed to load search index');
    searchIndex = await response.json();
    return searchIndex;
  } catch (error) {
    console.error('Error loading search index:', error);
    return [];
  }
}

export function searchArticles(query: string): SearchArticle[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  return searchIndex
    .filter((article) => {
      const titleMatch = article.title.toLowerCase().includes(lowerQuery);
      const descriptionMatch = article.description.toLowerCase().includes(lowerQuery);
      const tagMatch = article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
      const contentMatch = article.content.toLowerCase().includes(lowerQuery);

      return titleMatch || descriptionMatch || tagMatch || contentMatch;
    })
    .sort((a, b) => {
      // Boost title matches
      const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 2 : 1;
      const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 2 : 1;

      return bTitle - aTitle;
    });
}
