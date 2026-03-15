import type { CategoryKey } from './contracts.js';

export const PRIORITY_PREFIX_RE = /^[★⭐]\s*/u;

export function stripPriorityPrefix(value: string): string {
  return value.replace(PRIORITY_PREFIX_RE, '').trim();
}

export function slugify(value: string): string {
  return stripPriorityPrefix(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function buildFilename(date: Date, topic: string): string {
  return `${date.toISOString().slice(0, 10)}-${slugify(topic) || 'untitled-article'}.md`;
}

export function buildPublishedUrl(
  siteBaseUrl: string,
  category: CategoryKey,
  filename: string
): string {
  const base = siteBaseUrl.replace(/\/+$/, '');
  const slug = filename.replace(/\.md$/i, '');
  return `${base}/articles/${category}/${slug}`;
}

export function estimateReadingTime(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#>*_[\]()!-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200));
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map((tag) => (typeof tag === 'string' ? slugify(tag) : ''))
        .filter(Boolean)
        .slice(0, 8)
    ),
  ];
}

export function normalizeDescription(description: string, fallbackMarkdown: string): string {
  const base = description.trim() || stripMarkdown(fallbackMarkdown);
  return truncate(base, 200);
}

export function sanitizeBodyMarkdown(markdown: string): string {
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\s*/m, '');
  const withoutTitle = withoutFrontmatter.replace(/^#\s+.+?\n+/m, '');
  return withoutTitle.trim();
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
