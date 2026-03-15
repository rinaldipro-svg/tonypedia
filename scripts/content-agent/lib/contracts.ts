import {
  CATEGORY_KEYS,
  type CategoryKey,
} from '../../../src/shared/categories.js';

export { CATEGORY_KEYS };
export type { CategoryKey };

export const AUDIENCE_OPTIONS = [
  'Founders',
  'Marketers',
  'Developers',
  'General',
  'Other',
] as const;

export type Audience = (typeof AUDIENCE_OPTIONS)[number];

export const TONE_OPTIONS = [
  'Provocative',
  'Educational',
  'Data-driven',
  'Conversational',
  'Formal',
] as const;

export type Tone = (typeof TONE_OPTIONS)[number];

export interface AutomationMetadata {
  batchId?: string;
  filename?: string;
  generatedAt?: string;
  publishedAt?: string;
  topicSlug?: string;
}

export interface NotionArticleBrief {
  pageId: string;
  topic: string;
  angle: string;
  audience: Audience;
  tone: Tone;
  referenceLinks: string[];
  rawMessage: string;
  styleNotes: string;
  category: CategoryKey;
  status: string;
  automationMetadata: AutomationMetadata;
  publishedUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
}

export interface GeneratedArticle {
  title: string;
  description: string;
  tags: string[];
  body_markdown: string;
  category: CategoryKey;
  reading_time: number;
}

export interface DraftBatchArticle {
  topic: string;
  filename: string;
  category: CategoryKey;
  description: string;
  readingTime: number;
  draftMarkdown: string;
}

export interface PublishedArticleSummary {
  topic: string;
  url: string;
  category: CategoryKey;
}
