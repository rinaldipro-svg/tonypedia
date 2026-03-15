# Tonypedia Content Automation

This repo includes a full v1 content automation pipeline built around Notion, Anthropic, Gmail, GitHub Actions, and a dedicated Cloudflare Worker.

## What It Does

- Accepts article ideas from Telegram
- Parses them into structured Notion rows
- Generates batches of draft articles on a schedule
- Emails a single approval link for each draft batch
- Publishes approved articles directly into `src/content/articles/<category>/`
- Commits published content to `main`
- Sends a weekly content summary email

## Repo Layout

- `scripts/content-agent/` contains the Node/TypeScript automation scripts
- `workers/content-feed-bot/` contains the Telegram + approval Cloudflare Worker
- `.github/workflows/` contains the scheduled GitHub Actions jobs
- `killer_prompt.txt` contains the editable Tonypedia system prompt for article generation

## Required Notion Database Fields

Create or update the `Article Feed` database with these properties:

| Property | Type | Notes |
| --- | --- | --- |
| `Topic` | Title | Primary title/topic |
| `Angle` | Rich Text | Specific hook or framing |
| `Audience` | Select | `Founders`, `Marketers`, `Developers`, `General`, `Other` |
| `Tone` | Select | `Provocative`, `Educational`, `Data-driven`, `Conversational`, `Formal` |
| `Category` | Select | `tech`, `geopolitics`, `society`, `music`, `movies`, `events` |
| `Reference Links` | URL | Optional source URL |
| `Raw Message` | Rich Text | Original Telegram message |
| `Style Notes` | Rich Text | User-owned notes, not internal metadata |
| `Automation Metadata` | Rich Text | Internal JSON for batch/file state |
| `Status` | Select | `Ready`, `Processing`, `Draft Sent`, `Approved`, `Published`, `Rejected` |
| `Published URL` | URL | Filled in by the publish workflow |
| `Article ID` | Unique ID | Optional but recommended |

## Required Secrets

### Cloudflare Worker

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_AUTHORIZED_USER_ID`
- `ANTHROPIC_API_KEY`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `GITHUB_WORKFLOW_TOKEN`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `GITHUB_REPO_BRANCH` (optional, defaults to `main`)

### GitHub Actions

- `ANTHROPIC_API_KEY`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `GMAIL_ADDRESS`
- `GMAIL_APP_PASSWORD`
- `WORKER_BASE_URL`
- `SITE_BASE_URL`

`GITHUB_TOKEN` is used by default for publishing to `main`. If branch protection blocks workflow pushes, switch the checkout step to a PAT-backed token.

## Worker Setup

From `workers/content-feed-bot/`:

```bash
npm install
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_AUTHORIZED_USER_ID
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put NOTION_API_KEY
npx wrangler secret put NOTION_DATABASE_ID
npx wrangler secret put GITHUB_WORKFLOW_TOKEN
npx wrangler secret put GITHUB_REPO_OWNER
npx wrangler secret put GITHUB_REPO_NAME
npx wrangler secret put GITHUB_REPO_BRANCH
npx wrangler deploy
```

`GITHUB_WORKFLOW_TOKEN` should be a GitHub token that can dispatch Actions workflows for this repo.

Register Telegram's webhook against:

```text
https://<your-worker-url>/telegram
```

Health check endpoint:

```text
GET /health
```

Approval link endpoint:

```text
GET /approve/<batch-id>
```

Telegram bot commands:

- `/status` shows queue counts
- `/publish` triggers the next safe workflow step:
  - generates drafts if items are still `Ready`
  - refuses to skip email approval if items are `Draft Sent`
  - triggers publish immediately when items are already `Approved`

## Local Commands

```bash
npm run content:generate
npm run content:publish
npm run content:weekly-summary
```

Each command expects its required environment variables to already be available.
