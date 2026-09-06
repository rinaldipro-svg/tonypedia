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
  type: 'data',
  schema: z.object({
    cat: z.enum(['concepts', 'tools', 'guides', 'prompts', 'industry', 'data']),
    title: z.string(),
    source: z.string(),
    blurb: z.string(),
    size: z.enum(['col4', 'col6', 'col8', 'col12']).default('col4'),
    accent: z.string(),
    glow: z.string(),
    body: z.string(),
    feature: z.string().optional(),
    list: z.array(z.string()).optional(),
    stat: z.object({ n: z.string(), label: z.string() }).optional(),
    // string discriminator consumed by tableHTML(kind) in public/feed/index.html;
    // the row data lives in the page's RELEASES / COSTROWS / FRANCEROWS arrays.
    table: z.enum(['releases', 'cost', 'france']).optional(),
  }),
});

export const collections = { articles, studies, feed };
