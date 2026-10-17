import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildArticleMarkdown, writeArticleFile } from './lib/articles.js';
import { generateArticle } from './lib/anthropic.js';
import { getGenerateEnv, getRepoRoot, loadKillerPrompt } from './lib/config.js';
import type { DraftBatchArticle } from './lib/contracts.js';
import { sendDraftBatchEmail, sendEmptyQueueEmail } from './lib/email.js';
import { commitDraftBranch } from './lib/git.js';
import { getReadyBriefs, resetStaleProcessing, updatePageStatus } from './lib/notion.js';
import { notify } from './lib/telegram.js';
import { buildFilename, slugify } from './lib/utils.js';

export async function main(): Promise<void> {
  const env = getGenerateEnv();
  const killerPrompt = await loadKillerPrompt();
  const staleReset = await resetStaleProcessing(env.notionApiKey, env.notionDatabaseId, 30);
  if (staleReset > 0) {
    console.log(`Reset ${staleReset} stale Processing row(s) to Ready.`);
  }

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
  const failedTopics: Array<{ topic: string; message: string }> = [];
  const repoRoot = getRepoRoot();
  const draftFiles: Array<{ category: string; filename: string; markdown: string }> = [];
  const draftsToEmail: DraftBatchArticle[] = [];
  const draftedPages: Array<{
    pageId: string;
    metadata: {
      batchId: string;
      filename: string;
      draftPath: string;
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

        draftFiles.push({ category: brief.category, filename, markdown: draftMarkdown });

        draftedPages.push({
          pageId: brief.pageId,
          metadata: {
            batchId,
            filename,
            draftPath: `src/content/articles/${brief.category}/${filename}`,
            generatedAt,
            topicSlug: slugify(brief.topic),
          },
        });
      } catch (error) {
        console.error(`Failed to generate "${brief.topic}":`, error);
        failedTopics.push({
          topic: brief.topic,
          message: error instanceof Error ? error.message : String(error),
        });
        await updatePageStatus(env.notionApiKey, brief.pageId, 'Ready');
      }
    }

    if (draftsToEmail.length === 0) {
      console.log('No drafts were generated successfully.');
      for (const failure of failedTopics) {
        await notify(`Draft failed: ${failure.topic} — ${failure.message}`);
      }
      process.exitCode = 1;
      return;
    }

    const writtenPaths: string[] = [];
    for (const file of draftFiles) {
      writtenPaths.push(await writeArticleFile(repoRoot, file.category, file.filename, file.markdown));
    }
    commitDraftBranch(repoRoot, batchId, writtenPaths);

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

    for (const draft of draftsToEmail) {
      await notify(`Draft ready: ${draft.topic} — check email`);
    }
    for (const failure of failedTopics) {
      await notify(`Draft failed: ${failure.topic} — ${failure.message}`);
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
