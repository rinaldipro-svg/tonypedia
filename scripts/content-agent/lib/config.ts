import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

export interface SharedEnv {
  notionApiKey: string;
  notionDatabaseId: string;
}

export interface GenerateEnv extends SharedEnv {
  anthropicApiKey: string;
  gmailAddress: string;
  gmailAppPassword: string;
  workerBaseUrl: string;
  siteBaseUrl: string;
}

export interface PublishEnv extends SharedEnv {
  anthropicApiKey: string;
  gmailAddress: string;
  gmailAppPassword: string;
  siteBaseUrl: string;
}

export interface WeeklySummaryEnv extends SharedEnv {
  gmailAddress: string;
  gmailAppPassword: string;
  siteBaseUrl: string;
}

function readEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getRepoRoot(): string {
  return repoRoot;
}

export function getContentRoot(): string {
  return path.join(repoRoot, 'src', 'content', 'articles');
}

export async function loadKillerPrompt(): Promise<string> {
  const killerPromptPath = path.join(repoRoot, 'killer_prompt.txt');
  return (await readFile(killerPromptPath, 'utf8')).trim();
}

export function getGenerateEnv(): GenerateEnv {
  return {
    anthropicApiKey: readEnv('ANTHROPIC_API_KEY'),
    notionApiKey: readEnv('NOTION_API_KEY'),
    notionDatabaseId: readEnv('NOTION_DATABASE_ID'),
    gmailAddress: readEnv('GMAIL_ADDRESS'),
    gmailAppPassword: readEnv('GMAIL_APP_PASSWORD'),
    workerBaseUrl: normalizeUrl(readEnv('WORKER_BASE_URL')),
    siteBaseUrl: normalizeUrl(readEnv('SITE_BASE_URL')),
  };
}

export function getPublishEnv(): PublishEnv {
  return {
    anthropicApiKey: readEnv('ANTHROPIC_API_KEY'),
    notionApiKey: readEnv('NOTION_API_KEY'),
    notionDatabaseId: readEnv('NOTION_DATABASE_ID'),
    gmailAddress: readEnv('GMAIL_ADDRESS'),
    gmailAppPassword: readEnv('GMAIL_APP_PASSWORD'),
    siteBaseUrl: normalizeUrl(readEnv('SITE_BASE_URL')),
  };
}

export function getWeeklySummaryEnv(): WeeklySummaryEnv {
  return {
    notionApiKey: readEnv('NOTION_API_KEY'),
    notionDatabaseId: readEnv('NOTION_DATABASE_ID'),
    gmailAddress: readEnv('GMAIL_ADDRESS'),
    gmailAppPassword: readEnv('GMAIL_APP_PASSWORD'),
    siteBaseUrl: normalizeUrl(readEnv('SITE_BASE_URL')),
  };
}
