import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GeneratedArticle, NotionArticleBrief } from './contracts.js';
import { estimateReadingTime, normalizeDescription, normalizeTags, sanitizeBodyMarkdown } from './utils.js';

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function getPublicationDateFromFilename(filename: string, fallback = new Date()): Date {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-/);

  if (!match) {
    return fallback;
  }

  const parsed = new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function buildArticleMarkdown(
  brief: NotionArticleBrief,
  article: GeneratedArticle,
  publicationDate: Date
): string {
  const body = sanitizeBodyMarkdown(article.body_markdown);

  if (!body) {
    throw new Error(`Generated article for "${brief.topic}" is empty after sanitization.`);
  }

  const description = normalizeDescription(article.description, body);
  const tags = normalizeTags(article.tags);
  const readingTime = article.reading_time || estimateReadingTime(body);

  return `---
title: ${yamlString(article.title)}
description: ${yamlString(description)}
category: ${yamlString(brief.category)}
tags: ${JSON.stringify(tags)}
author: "Tony"
heroImage: ""
pubDate: ${publicationDate.toISOString().slice(0, 10)}
readingTime: ${readingTime}
featured: false
draft: false
---

${body}
`;
}

export async function writeArticleFile(
  repoRoot: string,
  category: string,
  filename: string,
  markdown: string
): Promise<string> {
  const categoryDirectory = path.join(repoRoot, 'src', 'content', 'articles', category);
  await mkdir(categoryDirectory, { recursive: true });
  const filePath = path.join(categoryDirectory, filename);
  await writeFile(filePath, markdown, 'utf8');
  return filePath;
}
