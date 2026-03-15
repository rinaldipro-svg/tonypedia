import { pathToFileURL } from 'node:url';
import { buildArticleMarkdown, getPublicationDateFromFilename, writeArticleFile } from './lib/articles.js';
import { generateArticle } from './lib/anthropic.js';
import { getPublishEnv, getRepoRoot, loadKillerPrompt } from './lib/config.js';
import { sendConfirmationEmail } from './lib/email.js';
import { commitAndPushPublishedArticles } from './lib/git.js';
import { getApprovedBriefs, updatePageStatus } from './lib/notion.js';
import { buildFilename, buildPublishedUrl, slugify } from './lib/utils.js';

export async function main(): Promise<void> {
  const env = getPublishEnv();
  const repoRoot = getRepoRoot();
  const killerPrompt = await loadKillerPrompt();
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

  for (const brief of approvedBriefs) {
    const filename = brief.automationMetadata.filename ?? buildFilename(new Date(), brief.topic);
    const publicationDate = getPublicationDateFromFilename(filename, new Date());
    const generated = await generateArticle(env.anthropicApiKey, killerPrompt, brief);
    const markdown = buildArticleMarkdown(brief, generated, publicationDate);
    const filePath = await writeArticleFile(repoRoot, brief.category, filename, markdown);
    const publishedAt = new Date().toISOString();
    const url = buildPublishedUrl(env.siteBaseUrl, brief.category, filename);

    writtenFiles.push(filePath);
    publishedArticles.push({
      pageId: brief.pageId,
      topic: generated.title,
      url,
      category: brief.category,
      metadata: {
        filename,
        batchId: brief.automationMetadata.batchId,
        generatedAt: brief.automationMetadata.generatedAt,
        topicSlug: brief.automationMetadata.topicSlug ?? slugify(brief.topic),
        publishedAt,
      },
    });
  }

  commitAndPushPublishedArticles(repoRoot, writtenFiles, publishedArticles.length);

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
