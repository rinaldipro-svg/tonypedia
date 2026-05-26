import { defineCollection, z } from 'astro:content';
import { CATEGORY_KEYS } from '../shared/categories';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    category: z.enum(CATEGORY_KEYS),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Tony'),
    heroImage: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    readingTime: z.number().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const studies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    accent: z.string(),
    coverGlyph: z.string().optional(),
    htmlFile: z.string().optional(),
  }),
});

const feed = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    source: z.string(),
    category: z.enum(['concepts', 'tools', 'guides', 'prompts', 'industry', 'data']),
    accent: z.string(),
    size: z.enum(['col4', 'col6', 'col8']).default('col4'),
    blurb: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { articles, studies, feed };
