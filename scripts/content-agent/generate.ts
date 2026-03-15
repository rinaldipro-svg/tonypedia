import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildArticleMarkdown } from './lib/articles.js';
import { generateArticle } from './lib/anthropic.js';
import { getGenerateEnv, loadKillerPrompt } from './lib/config.js';
import type { DraftBatchArticle } from './lib/contracts.js';
import { sendDraftBatchEmail, sendEmptyQueueEmail } from './lib/email.js';
import { getReadyBriefs, updatePageStatus } from './lib/notion.js';
import { buildFilename, slugify } from './lib/utils.js';

export async function main(): Promise<void> {
  const env = getGenerateEnv();
  const killerPrompt = await loadKillerPrompt();
  const readyBriefs = await getReadyBriefs(env.notionApiKey, env.notionDatabaseId, 3);

  if (readyBriefs.length === 0) {
    await sendEmptyQueueEmail(env);
    console.log('No Ready items found. Sent empty queue notification.');
    return;
  }

  for (const brief of readyBriefs) {
    await updatePageStatus(env.notionApiKey, brief.pageId, 'Processing');
  }

  const batchId = randomUUID();
  const draftsToEmail: DraftBatchArticle[] = [];
  const draftedPages: Array<{
    pageId: string;
    metadata: {
      batchId: string;
      filename: string;
      generatedAt: string;
      topicSlug: string;
    };
  }> = [];

  try {
    for (const brief of readyBriefs) {
      try {
        const generated = await generateArticle(env.anthropicApiKey, killerPrompt, brief);
        const generatedAt = new Date().toISOString();
        const filename = buildFilename(new Date(generatedAt), brief.topic);
        const draftMarkdown = buildArticleMarkdown(brief, generated, new Date(generatedAt));

        draftsToEmail.push({
          topic: generated.title,
          filename,
          category: brief.category,
          description: generated.description,
          readingTime: generated.reading_time,
          draftMarkdown,
        });

        draftedPages.push({
          pageId: brief.pageId,
          metadata: {
            batchId,
            filename,
            generatedAt,
            topicSlug: slugify(brief.topic),
          },
        });
      } catch (error) {
        console.error(`Failed to generate "${brief.topic}":`, error);
        await updatePageStatus(env.notionApiKey, brief.pageId, 'Ready');
      }
    }

    if (draftsToEmail.length === 0) {
      console.log('No drafts were generated successfully.');
      return;
    }

    await sendDraftBatchEmail({
      ...env,
      batchId,
      articles: draftsToEmail,
    });

    for (const page of draftedPages) {
      await updatePageStatus(env.notionApiKey, page.pageId, 'Draft Sent', {
        automationMetadata: page.metadata,
      });
    }

    console.log(`Generated ${draftsToEmail.length} draft(s) and sent approval email for batch ${batchId}.`);
  } catch (error) {
    for (const brief of readyBriefs) {
      await updatePageStatus(env.notionApiKey, brief.pageId, 'Ready');
    }

    throw error;
  }
}

const isMainModule =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
