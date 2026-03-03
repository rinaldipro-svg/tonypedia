export const CATEGORIES = {
  tech: { label: 'Tech & Business', color: 'blue', icon: '⚡' },
  geopolitics: { label: 'Geopolitics', color: 'red', icon: '🌍' },
  society: { label: 'Society', color: 'violet', icon: '🏛️' },
  music: { label: 'Music', color: 'amber', icon: '🎵' },
  movies: { label: 'Movies', color: 'emerald', icon: '🎬' },
  events: { label: 'Events', color: 'pink', icon: '📅' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export function getCategoryColor(category: CategoryKey): string {
  const colors: Record<string, Record<CategoryKey, string>> = {
    text: {
      tech: 'text-blue-500',
      geopolitics: 'text-red-500',
      society: 'text-violet-500',
      music: 'text-amber-500',
      movies: 'text-emerald-500',
      events: 'text-pink-500',
    },
    bg: {
      tech: 'bg-blue-500/20',
      geopolitics: 'bg-red-500/20',
      society: 'bg-violet-500/20',
      music: 'bg-amber-500/20',
      movies: 'bg-emerald-500/20',
      events: 'bg-pink-500/20',
    },
    border: {
      tech: 'border-blue-500',
      geopolitics: 'border-red-500',
      society: 'border-violet-500',
      music: 'border-amber-500',
      movies: 'border-emerald-500',
      events: 'border-pink-500',
    },
  };
  return colors.text[category];
}

export function getCategoryBgColor(category: CategoryKey): string {
  const colors: Record<CategoryKey, string> = {
    tech: 'bg-blue-500/20',
    geopolitics: 'bg-red-500/20',
    society: 'bg-violet-500/20',
    music: 'bg-amber-500/20',
    movies: 'bg-emerald-500/20',
    events: 'bg-pink-500/20',
  };
  return colors[category];
}

export function getCategoryBorderColor(category: CategoryKey): string {
  const colors: Record<CategoryKey, string> = {
    tech: 'border-blue-500',
    geopolitics: 'border-red-500',
    society: 'border-violet-500',
    music: 'border-amber-500',
    movies: 'border-emerald-500',
    events: 'border-pink-500',
  };
  return colors[category];
}
