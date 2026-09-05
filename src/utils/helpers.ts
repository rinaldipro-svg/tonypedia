export function formatDate(date: Date): string {
  // Frontmatter pubDate values are date-only strings (e.g. "2026-03-17") which
  // z.coerce.date() parses as UTC midnight. Formatting in UTC keeps the
  // displayed date equal to the authored calendar date regardless of the
  // runtime timezone (otherwise machines west of UTC render the previous day).
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return formatter.format(date);
}

export function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function getExcerpt(content: string, maxLength: number = 500): string {
  const plainText = content
    .replace(/[#*`_[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  return plainText.substring(0, maxLength).split(' ').slice(0, -1).join(' ') + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export function getUniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}
