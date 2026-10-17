import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPublishEnv, getRepoRoot } from './lib/config.js';
import { sendConfirmationEmail } from './lib/email.js';
import { checkoutDraftFile, commitAndPushPublishedArticles, deleteDraftBranch } from './lib/git.js';
import { getApprovedBriefs, updatePageStatus } from './lib/notion.js';
import { buildFilename, buildPublishedUrl, extractFrontmatterTitle, slugify } from './lib/utils.js';

export async function main(): Promise<void> {
  const env = getPublishEnv();
  const repoRoot = getRepoRoot();
  const approvedBriefs = await getApprovedBriefs(env.notionApiKey, env.notionDatabaseId);

  if (approvedBriefs.length === 0) {
    console.log('No Approved items found.');
    return;
  }

  const writtenFiles: string[] = [];
  const publishedArticles: Array<{
    pageId: string;
    topic: string;
    url: string;
    category: (typeof approvedBriefs)[number]['category'];
    metadata: {
      filename: string;
      batchId?: string;
      generatedAt?: string;
      topicSlug: string;
      publishedAt: string;
    };
  }> = [];

  const failedBatchIds = new Set<string>();
  const failures: Array<{ topic: string; message: string }> = [];

  for (const brief of approvedBriefs) {
    const { batchId, draftPath } = brief.automationMetadata;

    try {
      if (!batchId || !draftPath) {
        throw new Error('No saved draft (missing batchId/draftPath in Automation Metadata).');
      }

      const filename = brief.automationMetadata.filename ?? buildFilename(new Date(), brief.topic);
      checkoutDraftFile(repoRoot, batchId, draftPath);
      const filePath = path.join(repoRoot, draftPath);
      const title = extractFrontmatterTitle(await readFile(filePath, 'utf8')) ?? brief.topic;
      const publishedAt = new Date().toISOString();
      const url = buildPublishedUrl(env.siteBaseUrl, brief.category, filename);

      writtenFiles.push(filePath);
      publishedArticles.push({
        pageId: brief.pageId,
        topic: title,
        url,
        category: brief.category,
        metadata: {
          filename,
          batchId,
          generatedAt: brief.automationMetadata.generatedAt,
          topicSlug: brief.automationMetadata.topicSlug ?? slugify(brief.topic),
          publishedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to publish "${brief.topic}":`, error);
      failures.push({ topic: brief.topic, message });
      if (batchId) {
        failedBatchIds.add(batchId);
      }
    }
  }

  if (publishedArticles.length === 0) {
    console.log('No approved drafts could be published.');
    return;
  }

  commitAndPushPublishedArticles(repoRoot, writtenFiles, publishedArticles.length);

  const publishedBatchIds = new Set(
    publishedArticles.map((article) => article.metadata.batchId).filter((id): id is string => Boolean(id))
  );
  for (const batchId of publishedBatchIds) {
    if (!failedBatchIds.has(batchId)) {
      deleteDraftBranch(repoRoot, batchId);
    }
  }

  for (const article of publishedArticles) {
    await updatePageStatus(env.notionApiKey, article.pageId, 'Published', {
      automationMetadata: article.metadata,
      publishedUrl: article.url,
    });
  }

  await sendConfirmationEmail(
    env,
    publishedArticles.map((article) => ({
      topic: article.topic,
      url: article.url,
      category: article.category,
    }))
  );

  console.log(`Published ${publishedArticles.length} article(s).`);
}

const isMainModule =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
