# Claude Code Generation Guide for AlonChat

**Version:** 1.0
**Date:** September 22, 2025
**Purpose:** This Markdown file serves as a comprehensive prompt template and workflow guide for generating AlonChat's codebase using Claude (Anthropic's AI). It structures prompts to ensure modular, high-quality code output aligned with the AlonChat PRD. Use this by copying sections into Claude's interface, iterating on feedback loops (e.g., "Refine based on error: [paste log]").

## Why This Guide?

AlonChat is a Next.js + Supabase RAG chatbot builder for PH SMEs. Prompts are designed for rapid MVP (8 weeks): Start with core (auth/ingestion), layer features (RAG/actions), test iteratively. Always specify: TypeScript, error handling, PH localization (Tagalog/English), cost guards (e.g., sampling).

## Claude Prompting Best Practices

- **Structure:** Start with "You are a senior full-stack dev specializing in Next.js/Supabase AI apps. Output ONLY code + brief explanation. Use TS, ESLint clean."
- **Modularity:** Gen one file/module per prompt; reference PRD sections.
- **Testing:** After gen, run npm test or manual; prompt Claude: "Fix bug: [describe]."
- **Env Setup:** Assume repo: `npx create-next-app@latest alonchat --ts --app`; add deps: supabase/supabase-js, langchain, openai, beautifulsoup (Node equiv: cheerio), sharp, ffmpeg-static.
- **Secrets:** Use .env.local: SUPABASE_URL, OPENAI_API_KEY, etc.
- **Iteration:** For each module, prompt: "Gen [file]. Integrate with [prev module]. Align to PRD [section]."

---

## 1. Project Setup & Boilerplate

### 1.1 Initial Repo Scaffold Prompt

```
You are a senior full-stack dev. Create the initial Next.js 14 (App Router) project structure for AlonChat, a PH chatbot builder. Include:

- package.json with deps: next@14, react@18, typescript, @types/node, supabase/supabase-js, @supabase/auth-helpers-nextjs, langchain, @langchain/openai, openai, cheerio, pdf-parse, sharp, ffmpeg-static, bullmq, ioredis, next-intl, shadcn-ui (init with npx shadcn-ui@latest init), recharts, react-dropzone, tus-js-client, uppy.
- tsconfig.json, next.config.js (for i18n, images).
- Supabase schema SQL (via Supabase Studio): Tables from PRD (bots, chunks, conversations, leads); enable pgvector extension; RLS policies (user-owned).
- .env.example with keys: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, MAYA_SECRET.
- Folder structure: /app (pages), /components (UI), /lib (utils: supabase.ts, openai.ts), /hooks (useAuth), /actions (ingest/train), /locales (en/tl json).
- Basic layout: Root layout with i18n, theme provider (Shadcn).

Output: Full file contents. Explanation: 2 sentences max per file. Ensure mobile-responsive Tailwind.
```

### 1.2 Auth Module Prompt

```
Gen the auth system for AlonChat using Supabase Auth. Align to PRD 3.1.1.

- /lib/supabase.ts: Client/server supabase init.
- /hooks/useAuth.ts: Custom hook for session/user.
- /app/login/page.tsx: Google + Email form (Shadcn inputs, buttons); redirect to dashboard.
- /middleware.ts: Protect routes (/dashboard/*).
- Post-signup: Edge function hook to create user row in `users` table (tier: 'free').

Include error handling (toasts via sonner). PH: Add Tagalog error msgs. Output: Files + 1 test (Jest for login).
```

---

## 2. Dashboard & Bot Management

### 2.1 Dashboard Prompt

```
Build the AlonChat dashboard (PRD 3.1.1). Next.js page: /app/dashboard/page.tsx.

- Fetch bots via Supabase query (user_id filter).
- UI: Shadcn cards for each bot (name, usage, last trained); "New Bot" button → Wizard modal.
- Stats: Quick cards (total bots, queries this month from `conversations`).
- Billing: Simple tier selector (link to Maya checkout).
- i18n: Use next-intl for en/tl (e.g., t('dashboard.newBot')).

Mobile: Responsive grid. Output: Page + utils/query hook. Test: Mock data fetch.
```

### 2.2 Bot List & Editor Prompt

```
Gen bot management UI (PRD 3.1.2 Step 1). /app/bots/[id]/page.tsx + /components/BotEditor.tsx.

- Fetch bot by id; editable form: Name (input), Prompt (textarea, 500 chars), Tone (select: friendly/professional), Lang (toggle auto/en/tl).
- Save: Supabase upsert to `bots` table.
- Delete: Confirm modal + row delete.
- Integration: Button to "Ingest Data" → Wizard.

Use React Hook Form + Zod schema. Output: Component + page. Align to PRD schema.
```

---

## 3. Ingestion Wizard

### 3.1 Wizard Core Prompt

```
Create the multi-source ingestion wizard (PRD 3.1.2 Step 2). /components/IngestionWizard.tsx (multi-step form via react-hook-form).

- Steps: Source Select (checkboxes: website, faq, files, text, fb_export); Input Forms (conditional render).
- Website: URL input (array), crawl toggle → Call /api/ingest/website (POST with urls).
- FAQ: CSV dropzone or table editor (cols: q,a,media_url?).
- Files: react-dropzone (multi, validate types/sizes).
- Text: Textarea.
- FB Export: Tus resumable upload for ZIP (uppy integration); on-complete → /api/ingest/fb.

Progress bar; validate all fields. Output: Component + basic API stubs. i18n labels.
```

### 3.2 Website Scrape Prompt

```
Implement website ingestion (PRD 3.1.2). /api/ingest/website/route.ts (POST handler).

- Input: {urls: string[], crawlWhole: bool}.
- If crawl: Use cheerio + sitemap.js to fetch 100 pages max.
- Extract: Text, links, <img> srcs (media).
- Chunk: Recursive splitter (LangChain, 512 tokens).
- Embed: OpenAI text-embedding-3-small → Insert to `chunks` (source: 'website').
- Return: {status: 'queued', job_id}.

Error: Rate-limit (1s/delay). Cost guard: Limit free to 10 pages. Output: Full route + lib/cheerio-scraper.ts.
```

### 3.3 FAQ/Files/Text Prompt

```
Gen handlers for FAQ/Files/Text (PRD 3.1.2). Separate routes: /api/ingest/faq, /files, /text.

- FAQ: Parse CSV (papaparse) → Q&A pairs → Chunk as "Q: {q} A: {a}".
- Files: Switch (PDF: pdf-parse; DOCX: mammoth; TXT/CSV: fs.read); extract text/media.
- Text: Direct split.
- Common: Chunk/embed/insert (source_type in metadata); media VLM if URLs found (GPT-4o-mini, sample 20%).

Output: Routes + lib/file-parser.ts. Test with sample PDF.
```

### 3.4 FB Export Ingestion Prompt (Core Differentiator)

```
Build FB Export processor (PRD 3.1.2/3.1.3). /api/ingest/fb/route.ts + worker script.

- Input: ZIP path from Storage.
- Parse: Unzip (adm-zip); loop inbox folders → If HTML: BeautifulSoup (cheerio equiv) for msgs/timestamps/senders/links; If JSON: json.parse flatten.
- Media: Collect paths (photos/videos folders); dedupe (dHash via sharp/torch for photos, first-frame for videos); delete dups, remap refs.
- Extract: VLM (GPT-4o-mini) on uniques (prompt: "PH biz context: Prices/products"); Whisper (OpenAI) for videos (tl lang) + 3 keyframes VLM.
- Chunk: Group by thread/turn; append summaries/media metadata → Embed → Insert `chunks` (source: 'fb_export').
- Queue: BullMQ job for async (handle 3GB splits); progress via Supabase Realtime.
- Cost: Sample 20% media; return preview JSON (chunks count, media stats).

Output: Route + lib/fb-parser.ts (full script from earlier conv). Handle 10GB: Chunk process folders. Align to PRD costs ($6.50/10GB).
```

### 3.5 Preview & Train Prompt

```
Create KB preview and train (PRD 3.1.2 Step 3). /components/KBPreview.tsx + /api/train/route.ts.

- Preview: Fetch recent chunks (Supabase query, limit 50); pie chart (Recharts: sources), media carousel (thumbnails from Storage signed URLs), "Optimize" btn (triggers audit).
- Train: POST {bot_id, sources} → Cleanup (dedupe sim >0.8 cosine in pgvector), index build (HNSW), LLM audit ("Dirty KB? Flag spam").
- Return: {trained: true, kb_size: 500}.

Output: Component + route. Test: Mock chunks insert.
```

---

## 4. RAG & Chat Core

### 4.1 RAG Chain Prompt

```
Implement core RAG (PRD 3.1.3). /lib/rag-chain.ts (LangChain.js).

- Retrieve: Embed query (text-embedding-3-small) → SQL: SELECT top-5 chunks ORDER BY embedding <=> query_emb LIMIT 5 (pgvector).
- Augment: Prompt template: "PH bot: Context {chunks incl media summaries}. Query {q}. Reply structured: {text, links, attachments}."
- Gen: GPT-4o-mini (temp 0.7); output JSON parser.
- Hybrid: Rerank top-3 (Cohere if key; fallback sim).

Output: Function export. Cost: Cap k=3 free tier.
```

### 4.2 Chat API & Testing Prompt

```
Build chat endpoint and tester (PRD 3.1.4). /api/chat/[bot_id]/route.ts + /components/ChatTester.tsx.

- API: POST {message, session_id} → RAG call → Structured reply → Log to `conversations` (jsonb array).
- Tester: Stateful chat UI (messages array, send btn); render rich (text, links btns, media embeds).
- Messenger Hook: /api/messenger/webhook → Parse payload → RAG → Reply via Meta API (attachments).

Output: Route + component. Test: E2E Cypress for query flow.
```

---

## 5. Embeddings & Outputs

### 5.1 Widget Generator Prompt

```
Gen embedding widgets (PRD 3.1.5). /components/EmbedGenerator.tsx + /app/embed/[bot_id]/page.tsx.

- UI: Tabs (Iframe/JS/Messenger); gen code snippets (copy btn).
- Iframe: SSE stream replies; responsive (400x600 default).
- JS: Dynamic mount (script injects chat root).
- Messenger: Webhook URL gen + setup guide.

Output: Component + page. Ensure media renders (thumbnails).
```

### 5.2 Media Efficiency Prompt

```
Add media optimization (PRD 3.1.4). /lib/media-optimizer.ts.

- On chunk: Compress (Sharp WebP, FFmpeg H.264); tag optimal (LLM: "For price queries, top photo?").
- In RAG: Filter metadata.recommended_media; cache sends (Redis TTL 1h).
- Audit: Cron query logs → LLM: "Spam detected? Consolidate."

Output: Utils + integrate to rag-chain.ts. Save 30% costs.
```

---

## 6. Actions (Agents)

### 6.1 Actions Tab Prompt

```
Build Actions UI (PRD 3.1.6). /app/bots/[id]/actions/page.tsx + /components/ActionEditor.tsx.

- Ready-Made: Accordion toggles (Leads, Web Search, Cal, Button); config forms (e.g., Cal: OAuth btn).
- Custom: JSON schema editor (name, params, api_url); test btn.
- Save: Upsert to `bots` metadata.actions jsonb[].

Output: Page + component. i18n: t('actions.enableLead').
```

### 6.2 Action Execution Prompt

```
Implement actions in RAG (PRD 3.1.6). Extend rag-chain.ts.

- After retrieve: LLM classify: "Action needed? (e.g., 'book' → cal_tool)".
- Tools: LangChain (e.g., GoogleCalTool: OAuth fetch slots; MayaTool: Webhook pay).
- PH: LalamoveTool (API for bookings).
- Output: {reply, action_result} (e.g., "Booked! [Cal link]").

Output: Updated chain + sample tools (/lib/tools/google-cal.ts). Playground test.
```

---

## 7. Analytics & Billing

### 7.1 Analytics Dash Prompt

```
Gen analytics (PRD 3.1.7). /app/bots/[id]/analytics/page.tsx.

- Queries: Line chart (Recharts: daily from conversations.timestamp).
- Breakdown: Pie (sources, actions triggered).
- Efficiency: Gauge (media/query ratio <2).
- Export: CSV btn (papaparse).

Query Supabase aggregates. Output: Page + /api/analytics/[bot_id].
```

### 7.2 Billing Prompt

```
Integrate Maya payments (PRD Revenue). /app/billing/page.tsx + /api/subscribe/route.ts.

- Tiers table (free/starter/pro features).
- Checkout: Maya API (subscriptions, PHP pricing).
- Webhook: /api/maya/webhook → Update user.tier in Supabase.
- Quota check: Middleware for ingest limits.

Output: Page + route. Test sandbox.
```

---

## 8. Testing, Deployment & Iteration

### 8.1 E2E Tests Prompt

```
Create Cypress tests for AlonChat MVP. cypress/e2e/ (wizard.cy.ts, chat.cy.ts, embed.cy.ts).

- Wizard: Upload FB ZIP → Preview → Train.
- Chat: Query → Rich reply with media.
- Actions: Trigger Cal → Mock success.

Output: Full suite + run script.
```

### 8.2 Deployment Prompt

```
Vercel deploy guide. next.config.js: i18n, images (remotePatterns for Supabase).

- CI: GitHub Actions (lint/test/deploy).
- Env: Vercel project vars from .env.
- Scale: Auto; monitor Sentry.

Output: .github/workflows/deploy.yml + vercel.json.
```

---

## Final Notes

- **Total prompts:** 15-20 for MVP
- **Track progress:** GitHub issues (linked to PRD sections)
- **For bugs:** "Debug [error log]; gen fix patch."
- **Launch:** Beta invite via waitlist form
- **AlonChat is ready to wave!** 🚀