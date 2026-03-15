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

export const collections = { articles };
