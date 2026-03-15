import nodemailer from 'nodemailer';
import type { DraftBatchArticle, PublishedArticleSummary } from './contracts.js';
import { escapeHtml, stripMarkdown, truncate } from './utils.js';

interface MailerCredentials {
  gmailAddress: string;
  gmailAppPassword: string;
}

interface DraftBatchEmailOptions extends MailerCredentials {
  workerBaseUrl: string;
  batchId: string;
  articles: DraftBatchArticle[];
}

interface WeeklySummaryArticle {
  topic: string;
  url: string;
  audience: string;
}

function createTransport(credentials: MailerCredentials) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: credentials.gmailAddress,
      pass: credentials.gmailAppPassword,
    },
  });
}

export async function sendEmptyQueueEmail(credentials: MailerCredentials): Promise<void> {
  const transport = createTransport(credentials);

  await transport.sendMail({
    from: credentials.gmailAddress,
    to: credentials.gmailAddress,
    subject: 'Tonypedia Content Agent: queue empty',
    text: 'No Ready items were found in Notion, so no drafts were generated today.',
    html: `<p>No <strong>Ready</strong> items were found in Notion, so no drafts were generated today.</p>`,
  });
}

export async function sendDraftBatchEmail(options: DraftBatchEmailOptions): Promise<void> {
  const transport = createTransport(options);
  const approvalUrl = `${options.workerBaseUrl}/approve/${options.batchId}`;
  const generatedAt = new Date().toUTCString();

  const articleHtml = options.articles
    .map((article) => {
      const preview = truncate(stripMarkdown(article.draftMarkdown), 900);
      return `<section style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px;">
  <h2 style="margin: 0 0 8px; font-size: 20px;">${escapeHtml(article.topic)}</h2>
  <p style="margin: 0 0 8px; color: #4b5563;">${escapeHtml(article.description)}</p>
  <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">Category: ${escapeHtml(article.category)} · ${article.readingTime} min read · ${escapeHtml(article.filename)}</p>
  <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #111827; background: #f9fafb; padding: 12px; border-radius: 8px;">${escapeHtml(preview)}</pre>
</section>`;
    })
    .join('\n');

  await transport.sendMail({
    from: options.gmailAddress,
    to: options.gmailAddress,
    subject: `Tonypedia drafts ready: ${options.articles.length} article(s)`,
    text: `Generated ${options.articles.length} draft(s) on ${generatedAt}.

Approve this batch here:
${approvalUrl}`,
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 760px; margin: 0 auto; padding: 24px;">
  <h1 style="margin: 0 0 8px;">Tonypedia drafts ready</h1>
  <p style="color: #4b5563;">Generated ${escapeHtml(generatedAt)}. Approving this batch publishes every draft below.</p>
  <p style="margin: 20px 0;">
    <a href="${approvalUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px;">Approve this batch</a>
  </p>
  ${articleHtml}
</div>`,
  });
}

export async function sendConfirmationEmail(
  credentials: MailerCredentials,
  articles: PublishedArticleSummary[]
): Promise<void> {
  const transport = createTransport(credentials);
  const htmlList = articles
    .map(
      (article) =>
        `<li style="margin-bottom: 10px;"><a href="${article.url}" style="color: #2563eb; text-decoration: none;">${escapeHtml(article.topic)}</a><div style="color: #6b7280; font-size: 13px;">${escapeHtml(article.category)} · ${escapeHtml(article.url)}</div></li>`
    )
    .join('');

  await transport.sendMail({
    from: credentials.gmailAddress,
    to: credentials.gmailAddress,
    subject: `Tonypedia published ${articles.length} article(s)`,
    text: articles.map((article) => `${article.topic}: ${article.url}`).join('\n'),
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 680px; margin: 0 auto; padding: 24px;">
  <h1 style="margin-top: 0;">Articles published</h1>
  <p style="color: #4b5563;">The following article(s) are now live on Tonypedia.</p>
  <ul style="padding-left: 20px;">${htmlList}</ul>
</div>`,
  });
}

export async function sendWeeklySummaryEmail(
  credentials: MailerCredentials,
  articles: WeeklySummaryArticle[],
  stats: Record<string, number>,
  startedAt: Date,
  endedAt: Date
): Promise<void> {
  const transport = createTransport(credentials);
  const readyCount = stats.Ready ?? 0;
  const htmlArticles =
    articles.length > 0
      ? articles
          .map(
            (article) =>
              `<li style="margin-bottom: 10px;"><a href="${article.url}" style="color: #2563eb; text-decoration: none;">${escapeHtml(article.topic)}</a><div style="color: #6b7280; font-size: 13px;">Audience: ${escapeHtml(article.audience)} · ${escapeHtml(article.url)}</div></li>`
          )
          .join('')
      : '<p style="color: #6b7280;">No articles were published in the last 7 days.</p>';

  const statsRows = ['Ready', 'Processing', 'Draft Sent', 'Approved', 'Published', 'Rejected']
    .map(
      (status) =>
        `<tr><td style="padding: 4px 12px 4px 0;">${escapeHtml(status)}</td><td style="padding: 4px 0; font-weight: 600;">${stats[status] ?? 0}</td></tr>`
    )
    .join('');

  await transport.sendMail({
    from: credentials.gmailAddress,
    to: credentials.gmailAddress,
    subject: `Tonypedia weekly summary: ${articles.length} published`,
    text: `Published this week: ${articles.length}
Ready queue: ${readyCount}`,
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 24px;">
  <h1 style="margin-top: 0;">Tonypedia weekly summary</h1>
  <p style="color: #4b5563;">${escapeHtml(startedAt.toUTCString())} to ${escapeHtml(endedAt.toUTCString())}</p>
  <div style="background: #f3f4f6; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
    <strong style="font-size: 28px;">${articles.length}</strong> article(s) published this week
  </div>
  <h2>Published articles</h2>
  <ul style="padding-left: 20px;">${htmlArticles}</ul>
  <h2>Queue status</h2>
  <table>${statsRows}</table>
  ${
    readyCount < 6
      ? `<p style="margin-top: 20px; padding: 12px 14px; border-radius: 10px; background: #fef3c7; color: #92400e;">Low queue warning: only ${readyCount} Ready item(s) remain.</p>`
      : ''
  }
</div>`,
  });
}
