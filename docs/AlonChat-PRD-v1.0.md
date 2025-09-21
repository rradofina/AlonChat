# Product Requirements Document (PRD): AlonChat

**Document Version:** 1.0
**Date:** September 22, 2025
**Author:** Development Team
**Product Owner:** Founder
**Stakeholders:** Development Team, Beta Users (PH SMEs), Legal (DPA Compliance)
**Approval Status:** Draft – Pending Review

---

## 1. Executive Summary

### 1.1 Product Overview

AlonChat is a no-code/low-code AI chatbot builder tailored for the Philippine market, enabling small-to-medium enterprises (SMEs) to create personalized, multimodal bots from diverse data sources—including a unique integration for Facebook Messenger exports. Inspired by Chatbase.co but optimized for PH realities (e.g., FB-heavy workflows, Tagalog-English bilingualism, and mobile-first usage), AlonChat transforms raw chat history, websites, FAQs, and files into intelligent agents that handle text, links, photos, and videos in responses.

**Key differentiator:** FB Export Processing—Users upload Messenger ZIPs (up to 10GB), which the platform parses (HTML/JSON), deduplicates media, extracts context via multimodal AI (VLM/Whisper), and builds evolving knowledge bases (KBs). Bots embed seamlessly on websites (iframe/JS) or Messenger, with rich outputs and efficiency optimizations to minimize costs (e.g., no spam sends of duplicate photos).

AlonChat evolves bots into "agents" via AI Actions (ready-made for leads/calendars, custom for APIs like Maya payments or Lalamove bookings), boosting conversions by 25-30% for PH users (e.g., tutors scheduling via Google Calendar, vendors processing GCash).

**Tagline:** "Mine Your Messenger: Build Smarter Bots for PH Biz."
**Launch Goal:** MVP beta with 50 PH SMEs in Q4 2025; full launch Q1 2026.

### 1.2 Business Objectives

- **Market Opportunity:** ₱10B+ PH digital commerce market (Statista 2025); 1M+ FB Pages underserved by AI (only 15% adoption per DICT). Target: Capture 1% ($100k ARR) in Year 1 via freemium.
- **Revenue Model:** Freemium (free: 1 bot, text-only); Starter (₱299/mo: +Website/Files); Pro (₱999/mo: FB Exports + Media/Actions, unlimited).
- **Key Metrics:** 70% retention, 85% reply accuracy (user-rated), <5-min setup, NPS >8.
- **Competitive Edge:** Chatbase is text/global; AlonChat is multimodal/PH-native (FB focus, local payments/actions).

### 1.3 Scope

- **In Scope (MVP):** Multi-source ingestion, RAG-based bots, embeddings, rich outputs, basic analytics, 2-3 ready-made actions.
- **Out of Scope:** Multi-user teams, on-prem deploy, advanced fine-tuning (use OpenAI for now), non-PH langs beyond Tagalog-English.

---

## 2. User Personas & Needs

### 2.1 Primary Personas

| Persona | Description | Goals | Pain Points | How AlonChat Helps |
|---------|-------------|-------|-------------|-------------------|
| **Luz** (Food Cart Owner, 35, Manila) | Runs sari-sari store via FB Page; 100 chats/week on orders/prices. Mobile-only user. | Quick replies to "Magkano adobo?" with menu photo; auto-book deliveries. | Manual FB replies eat 10h/week; spams old photos; no easy scheduling. | FB export → Bot sends targeted menu vid; Lalamove action for bookings. |
| **Rico** (Freelance Tutor, 28, Cebu) | Teaches online math; uses FB Messenger for inquiries. Tech-curious but no-code preferred. | Schedule sessions via Google Cal; answer FAQs with diagrams. | Forgets to check calendar; inconsistent replies in Tagalog. | Q&A upload + Cal action; bilingual prompts. |
| **Mara** (E-Tailer, 42, Davao) | Sells clothes on Shopee/FB; handles 500 queries/mo. | Embed bot on site; track leads/payments. | Overwhelmed by haggling; duplicate media wastes data. | Website scrape + Maya action; dedupe optimizes sends. |
| **Dev Alex** (Agency Owner, 31, Quezon) | Builds bots for clients; needs custom integrations. | API hooks for CRM; analytics for ROI. | Generic tools lack PH APIs; high costs for media. | Custom actions + efficiency audits. |

### 2.2 User Journey Map

1. **Awareness:** FB Ads/TikTok: "Turn FB chats into 24/7 sales bot—free trial!"
2. **Onboarding:** 3-min wizard; guided FB export modal.
3. **Usage:** Daily queries; weekly "Add data" for evolution.
4. **Retention:** Email nudges: "Your bot saved 5h this week—add actions?"

---

## 3. Functional Requirements

### 3.1 Core Features

#### 3.1.1 User Authentication & Dashboard

- **Sign-Up/Login:** Email + Google OAuth (Supabase Auth); mandatory email verification.
- **Dashboard:** Personalized view: Bots list (name, usage stats), "New Bot" button, billing overview.
- **Roles:** Free/Pro tiers enforce quotas (e.g., 1GB FB limit on free).
- **Localization:** next-intl for en/tl; auto-detect browser lang.

#### 3.1.2 Bot Creation Wizard

**Step 1: Basics**
- Name, system prompt (editor with PH templates: "Friendly Tagalog sales bot")
- Personality (tone: casual/professional)
- Max tokens/temp settings

**Step 2: Ingestion (Multi-Source)**
Accordion tabs for selection:
- **Website:** URL input (single/multi); "Crawl whole site" toggle (sitemap limit 100 pages). Extracts text/links/images.
- **Q&A/FAQ:** CSV/JSON upload or in-app table editor (cols: question, answer, media?).
- **Files:** Drag-drop (PDF/DOCX/TXT/CSV, max 50MB/file, 10 files/bot); auto-parse.
- **Paste Text:** Textarea (10k chars max); optional media URLs.
- **FB Export:** ZIP upload (10GB max, split handling); guided modal with Meta steps. Processes HTML/JSON + media dedupe.

**Step 3: Preview & Train**
- "KB Preview" (chunks count, sources pie chart, media thumbnails)
- "Optimize Media?" toggle (runs VLM/dedupe)
- Async train (5-10 mins; progress email)

**Step 4: Customize**
- Language toggle (auto-detect)
- Actions setup (see 3.1.5)

#### 3.1.3 Knowledge Base Management

- **Unified RAG:** All sources → Chunks (512 tokens) → Embed (OpenAI text-embedding-3-small) → pgvector table
  - Schema: `chunks: id, bot_id, text, embedding vector(1536), metadata jsonb {source, media_urls, summary}`
- **FB-Specific:** Parse ZIP folders (BeautifulSoup for HTML); dedupe media (perceptual hash); VLM/Whisper for photos/videos (summaries in metadata)
- **Evolution:** "Add Data" button re-runs ingestion; auto-diff (novel cases appended via similarity >0.8 cosine)
- **Dirty KB Cleaner:** On-train audit: LLM flags spam (e.g., "5+ media/chunk? Consolidate"); user approve

#### 3.1.4 Chat Interface & Outputs

- **In-App Testing:** Real-time sim (Next.js chat UI); shows structured replies
- **Rich Outputs:** JSON from LLM: `{text, links: [{label, url}], attachments: [{type: 'photo'|'video', url, alt}]}`
  - Web: Bubbles + thumbnails (React Player for vids)
  - Messenger: Meta API attachments (image/video payloads)
- **Efficiency:** Cache media URLs; prompt: "Optimal 1 media/query"; compress (WebP/H.264)

#### 3.1.5 Embeddings & Integrations

- **Web Widget:** Generate iframe/JS code; customizable theme/CSS
- **Messenger:** Webhook setup (Meta Dev paste); handover protocol for seamless routing
- **Quotas:** Pro: Unlimited embeds; track via Supabase logs

#### 3.1.6 AI Actions (Agents)

**Ready-Made (No-Code):**
1. **Lead Capture:** Form modal (fields: name, email, query); LLM triggers ("Need details?"); store in Supabase leads table; email/Slack notify
2. **Web Search:** Tavily/OpenAI tool; prompt: "Real-time info? Search PH sites." (Limit 5 results; images toggle)
3. **Calendar Booking:** Google Calendar OAuth; "Book now?" → Availability slots (Cal.com fallback). PH: "Sunod oras?" in Tagalog
4. **Custom Button:** URL + label (e.g., "Pay via Maya"); AI instructions: "When payment mentioned."

**Custom (Dev):**
- JSON schema editor (e.g., `{name: 'maya_pay', params: {amount}, api_url}`)
- LangChain tool call in RAG chain
- PH Priorities: Maya/GCash (payments), Lalamove (bookings), J&T (tracking)
- Playground: Test actions in sim

**Flow:** RAG retrieves → LLM: "Matches action? If yes, call tool + confirm with user."

#### 3.1.7 Analytics

- **Dashboard Per Bot:** Recharts: Queries/day, sources breakdown, media open rates, action triggers (e.g., "50 bookings")
- **Efficiency Metrics:** "Spam Score" (attachments/query), cost estimator (₱/mo)
- **Exports:** CSV/PDF; BIR-compliant invoices

### 3.2 Non-Functional Requirements

- **Performance:** <2s reply latency; process 10GB in <10 mins (async)
- **Security:** RLS on Supabase (user-owned KBs); anonymize PII (regex in FB parse); HTTPS; OWASP scans
- **Compliance:** DPA (consent modals, 30-day retention); BIR VAT on subs
- **Scalability:** Vercel auto-scale; pgvector HNSW index for 1M+ chunks
- **Accessibility:** WCAG 2.1; mobile-first (Tailwind responsive)
- **Costs:** <$₱500/mo at 100 users (OpenAI quotas; batch discounts)

---

## 4. User Flows & Wireframes

### 4.1 Primary Flow: Create & Deploy Bot

1. Login → Dashboard → "New Bot" → Name/Prompt
2. Ingestion Wizard: Select FB Export → Upload ZIP → Preview (chunks/media stats)
3. Train → Customize Actions (e.g., enable Google Cal)
4. Test: Query "Schedule math class?" → Reply: "Available Thu 7PM [Cal button]"
5. Deploy: Copy iframe code → Paste on site
6. Analytics: "Bot handled 20 queries; 80% with photo"

**Edge Flow:** FB Re-Upload: "Evolve KB" → Diff preview ("+15 new cases") → Retrain

### 4.2 Wireframe Sketches (Textual – Use Figma for Visuals)

- **Wizard Step 2:** Tabs: [Website | FAQ | Files | Text | FB Export]. FB tab: Drag-zone + "Guide" button (modal with steps)
- **Preview:** Table: Chunks (snippet, source icon), Media Carousel (thumbnails + "Optimize" btn)
- **Actions Tab:** Accordion: Ready-Made (toggles + configs), Custom (JSON editor)
- **Embed Page:** Code snippets (iframe/JS/Messenger) + live preview

---

## 5. Technical Specifications

### 5.1 Architecture

- **Frontend:** Next.js 14 (App Router, TS); Shadcn/UI + Tailwind
- **Backend:** Supabase (Auth, Postgres + pgvector, Storage, Edge Functions); LangChain.js for RAG/actions
- **AI:** OpenAI (GPT-4o-mini for gen/VLM, Whisper, embeddings); HF fallback for free Whisper
- **Queue:** BullMQ (Upstash Redis) for async (ingest/train)
- **Media:** FFmpeg/Sharp for compress; Supabase CDN for serve
- **Integrations:** Meta Graph API (Messenger), Google OAuth (Cal), Maya Webhooks

#### DB Schema (Key Tables)

| Table | Columns | Purpose |
|-------|---------|---------|
| `bots` | `id (uuid PK), user_id, name, prompt (text), tier (enum)` | Bot metadata |
| `chunks` | `id, bot_id (FK), text, embedding (vector), metadata (jsonb {source, media})` | RAG index |
| `conversations` | `id, bot_id, messages (jsonb[]), actions_triggered (jsonb[])` | Logs |
| `leads` | `id, bot_id, data (jsonb)` | Action outputs |

#### API Endpoints (Examples)

- `POST /api/ingest/fb`: Queue ZIP process
- `POST /api/chat/{bot_id}`: RAG query + actions
- `GET /embed/{bot_id}`: Iframe stream

### 5.2 Data Flow Diagram

```
User Upload (ZIP/Site/FAQ) → Supabase Storage → Edge Fn (Parse/Dedupe/VLM) → Chunks Table (pgvector)
                                                                                        ↓
Query (Web/Messenger) → Embed Query → SQL Search (Top-5 Chunks) → LLM Gen (w/ Actions) → Structured Reply (Text/Media)
                                                                                        ↓
                                        Log to Conversations → Analytics Cron (Patterns/Efficiency)
```

### 5.3 Development Guidelines

- **Claude Code Gen:** Modular: Separate `ingest-fb.ts`, `rag-chain.ts`
- **Testing:** Jest (unit: Parsing), Cypress (E2E: Wizard), manual on 1.7GB export
- **Costs Guard:** Quota middleware (e.g., check tier before VLM)

---

## 6. Success Metrics & KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Adoption** | 100 sign-ups/mo | Google Analytics |
| **Engagement** | 50 queries/bot/week | Supabase logs |
| **Accuracy** | >85% (thumbs up/down) | User feedback in sim |
| **Efficiency** | <₱50/mo/bot (media) | OpenAI dashboard |
| **Business** | 20% conversion to Pro | Stripe/Maya |

**A/B Tests:** Wizard variants (FB-first vs. balanced); action triggers

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **High Processing Costs** | High | Med | Dedupe/sampling; free tier caps; HF alternatives |
| **DPA Compliance** | High | Low | Legal review (₱50k); anonymize on-ingest |
| **Low Adoption (FB Friction)** | High | Med | Video guides; API fallback for recent chats |
| **Media Accuracy (VLM)** | Med | High | User preview/feedback loop; Tagalog-tuned prompts |
| **Tech Debt (Actions)** | Med | Low | Start ready-made; modular LangChain |

**Contingency:** If costs >20% revenue, pivot to usage-based billing

---

## 8. Roadmap & Timeline

| Phase | Timeline | Key Deliverables | Effort (Weeks) |
|-------|----------|------------------|----------------|
| **MVP Build** | Oct 2025 | Wizard, RAG, Embed, FB Ingest (basic media) | 8 (Claude-assisted) |
| **Beta Launch** | Nov 2025 | +Analytics, 2 Actions (Leads/Cal). 50 users | 4 |
| **V1 Release** | Jan 2026 | Full Media Opt, Custom Actions, Maya Int | 6 |
| **V2 Scale** | Q2 2026 | Advanced Analytics, Multi-Bot, Enterprise | 8 |

**Resources:** 1 Full-Stack Dev (you + Claude); ₱100k budget (Vercel $500/mo, OpenAI $2k/mo)

---

## 9. Appendices

### 9.1 Glossary

- **RAG:** Retrieval-Augmented Generation (vector search + LLM)
- **VLM:** Vision-Language Model (e.g., GPT-4o for images)
- **KB:** Knowledge Base (pgvector index)

### 9.2 References

- Meta Export Docs (2025)
- OpenAI Pricing (Sept 2025)
- PH DICT AI Report (2025)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Sept 22, 2025 | Development Team | Initial draft |

---

## Approval Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | [Pending] | | |
| Tech Lead | [Pending] | | |
| Legal Compliance | [Pending] | | |