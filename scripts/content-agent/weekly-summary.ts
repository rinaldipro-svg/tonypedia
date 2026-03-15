import { pathToFileURL } from 'node:url';
import { getWeeklySummaryEnv } from './lib/config.js';
import { sendWeeklySummaryEmail } from './lib/email.js';
import { getPublishedBriefsSince, getQueueStats } from './lib/notion.js';

export async function main(): Promise<void> {
  const env = getWeeklySummaryEnv();
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
  const publishedArticles = await getPublishedBriefsSince(
    env.notionApiKey,
    env.notionDatabaseId,
    startedAt.toISOString()
  );
  const stats = await getQueueStats(env.notionApiKey, env.notionDatabaseId);

  await sendWeeklySummaryEmail(
    env,
    publishedArticles.map((article) => ({
      topic: article.topic,
      url: article.publishedUrl ?? '#',
      audience: article.audience,
    })),
    stats,
    startedAt,
    endedAt
  );

  console.log(`Sent weekly summary for ${publishedArticles.length} published article(s).`);
}

const isMainModule =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
