export const CATEGORY_KEYS = [
  'tech',
  'geopolitics',
  'society',
  'music',
  'movies',
  'events',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_META: Record<
  CategoryKey,
  {
    label: string;
    color: string;
    icon: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  tech: {
    label: 'Tech & Business',
    color: 'blue',
    icon: '\u26A1',
    textClass: 'text-blue-500',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500',
  },
  geopolitics: {
    label: 'Geopolitics',
    color: 'red',
    icon: '\u{1F30D}',
    textClass: 'text-red-500',
    bgClass: 'bg-red-500/20',
    borderClass: 'border-red-500',
  },
  society: {
    label: 'Society',
    color: 'violet',
    icon: '\u{1F3DB}\uFE0F',
    textClass: 'text-violet-500',
    bgClass: 'bg-violet-500/20',
    borderClass: 'border-violet-500',
  },
  music: {
    label: 'Music',
    color: 'amber',
    icon: '\u{1F3B5}',
    textClass: 'text-amber-500',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500',
  },
  movies: {
    label: 'Movies',
    color: 'emerald',
    icon: '\u{1F3AC}',
    textClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/20',
    borderClass: 'border-emerald-500',
  },
  events: {
    label: 'Events',
    color: 'pink',
    icon: '\u{1F4C5}',
    textClass: 'text-pink-500',
    bgClass: 'bg-pink-500/20',
    borderClass: 'border-pink-500',
  },
};
