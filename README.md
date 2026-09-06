# Tonypedia V2

Your World, Explained. A modern knowledge hub built with Astro and Cloudflare Pages.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- [Cloudflare account](https://dash.cloudflare.com) (for deployment)
- [Anthropic API key](https://console.anthropic.com) (for AI chatbot)

### Local Development

1. **Install dependencies**

```bash
npm install
```

2. **Start the dev server**

```bash
npm run dev
```

The site will be available at `http://localhost:3000` (or the port shown in your terminal).

3. **Build for production**

```bash
npm run build
```

4. **Preview the production build**

```bash
npm run preview
```

## 📝 Creating Content

### Via Pages CMS

If you connect your GitHub repo to [Cloudflare Pages](https://pages.cloudflare.com), you'll get access to the built-in CMS interface.

1. Link your repo to Cloudflare Pages
2. Framework preset: **Astro**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Navigate to your Pages project → Settings → Admin
6. Use the CMS to create and publish articles

### Manually (Recommended for Development)

Create a new markdown file in `src/content/articles/{category}/`:

```markdown
---
title: "Article Title"
description: "Short description (max 200 chars)"
category: "tech"  # or: geopolitics, society, music, movies, events
tags: ["tag1", "tag2"]
author: "Tony"
pubDate: 2025-03-01
readingTime: 5  # optional; auto-calculated if omitted
featured: false
draft: false
heroImage: "/images/article-hero.jpg"  # optional
---

## Article content goes here

Write in Markdown. Code blocks will be syntax-highlighted.
```

**Categories** (lowercase in file path):
- `tech` - Tech & Business
- `geopolitics` - Geopolitics
- `society` - Society
- `music` - Music
- `movies` - Movies
- `events` - Events

## 🎨 Design & Styling

- **Framework**: Tailwind CSS 4
- **Typography**: Space Grotesk (headers), Inter (body)
- **Dark Mode**: Toggle via ThemeToggle component; stored in a cookie
- **Components**: All in `src/components/` - Astro components, no client JS except for islands

### Color Scheme

- **Navy backgrounds**: `#0a0f1e`, `#111827`, `#1f2937`
- **Category colors**: Blue (tech), Red (geopolitics), Violet (society), Amber (music), Emerald (movies), Pink (events)
- **Accent**: Blue-500 for CTAs and highlights

## 🤖 AI Chatbot

The chatbot runs on Claude Haiku and does keyword search over your articles. It
is served same-origin by the Astro API route `src/pages/api/chat.ts` (an
on-demand route, `prerender = false`) — there is no separate Worker to deploy.

### Setup

1. Get an [Anthropic API key](https://console.anthropic.com/)

2. Set it as a secret on the site's Worker, from the repo root:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

   For local `astro dev`, put `ANTHROPIC_API_KEY=sk-ant-...` in a git-ignored
   `.dev.vars` file at the repo root instead.

3. Deploy the site normally (see Deployment below). The route reads the article
   corpus straight from the content collection, so no `SITE_URL` is needed.

Without the key set, the route returns a graceful error and the widget shows a
"try again later" message.

## 🛠️ Content Automation

The repo now includes a separate Tonypedia content automation system for Telegram intake, Notion queueing, scheduled Anthropic article generation, email approvals, and GitHub-based publishing.

Setup docs:

- `docs/content-automation.md`
- `workers/content-feed-bot/`
- `scripts/content-agent/`

## 🚀 Deployment

### Deploy to Cloudflare Pages

1. **Push your code to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tonypedia.git
git push -u origin main
```

2. **Connect to Cloudflare Pages**

- Go to [Cloudflare Pages](https://pages.cloudflare.com)
- Click "Create a project"
- Select your repository
- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`
- Click "Save and Deploy"

3. **Set environment variables** (if using the chatbot)

Add the Anthropic API key as a secret on the site's Worker:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Once deployed, your site will be live at your custom domain (if configured) or `https://tonypedia.rinaldipro.workers.dev`.

## 📊 Project Structure

```
tonypedia/
├── src/
│   ├── content/
│   │   ├── config.ts          # Content schema definitions
│   │   └── articles/          # Markdown articles organized by category
│   ├── layouts/
│   │   ├── BaseLayout.astro   # Main page wrapper
│   │   └── ArticleLayout.astro # Article page layout
│   ├── components/            # Astro components (no client JS)
│   │   ├── Navbar.astro
│   │   ├── Hero.astro
│   │   ├── Chatbot.astro      # Interactive island
│   │   ├── SearchModal.astro  # Interactive island
│   │   ├── ThemeToggle.astro  # Interactive island
│   │   └── ...
│   ├── pages/                 # Astro routes
│   │   ├── index.astro        # Homepage
│   │   ├── articles/          # Article pages & listing
│   │   ├── category/          # Category pages
│   │   ├── tags/              # Tag pages
│   │   ├── api/
│   │   │   └── chat.ts        # Chatbot endpoint (on-demand, prerender = false)
│   │   ├── search-index.json.ts
│   │   ├── rss.xml.ts
│   │   └── 404.astro
│   ├── scripts/               # Utility TypeScript
│   ├── styles/
│   │   └── global.css         # Tailwind + custom utilities
│   └── utils/
│       ├── categories.ts      # Category definitions & colors
│       └── helpers.ts         # Date, reading time, etc.
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── images/
├── workers/
│   └── content-feed-bot/      # Telegram intake Worker (content automation)
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── .pages.yml                 # Pages CMS config
└── README.md
```

## 🔧 Key Features

✅ **Static Site Generation (SSG)** — Fast, secure, no server needed
✅ **Content Collections** — Type-safe Markdown with schema validation
✅ **Dark Mode** — Toggle with cookie persistence (no hydration issues)
✅ **Search** — Client-side search over all articles
✅ **AI Chatbot** — Powered by Claude Haiku + semantic search
✅ **Responsive Design** — Mobile-first, works on all devices
✅ **RSS Feed** — Subscribe at `/rss.xml`
✅ **SEO Ready** — Open Graph, Twitter cards, meta tags
✅ **Zero Client JS** — Except interactive islands (Chatbot, Search, Theme)
✅ **TypeScript** — Full type safety throughout

## 📚 Content Prompt Template

When creating articles with Claude Opus, use this template:

```
You are a writer for Tonypedia, a curated knowledge hub. Write an article on [TOPIC].

Requirements:
- Title: Clear, engaging (5-10 words)
- Description: One sentence summary (under 160 chars)
- Structure: Intro → 3-4 main sections → Conclusion
- Length: 1000-1500 words
- Tone: Informative, accessible, no jargon or explain if used
- Format: Markdown with ## section headers
- Include examples and real-world context

Output ONLY the frontmatter + markdown content:

---
title: "..."
description: "..."
category: "tech"  [or: geopolitics, society, music, movies, events]
tags: [...]
author: "Tony"
pubDate: 2025-03-15
readingTime: 5
featured: false
draft: false
---

[Article content]
```

## 🤝 Contributing

Contributions are welcome! To add an article or improve the site:

1. Fork the repository
2. Create a branch (`git checkout -b feature/new-article`)
3. Add your content
4. Test locally (`npm run build`)
5. Commit and push
6. Open a Pull Request

## 📄 License

MIT License — feel free to use this as a template for your own project.

## 🔗 Links

- [Astro Docs](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [Anthropic Claude](https://www.anthropic.com)

---

**Built with ⚡ Astro + 🎨 Tailwind + 🚀 Cloudflare Pages**

Your World, Explained.
