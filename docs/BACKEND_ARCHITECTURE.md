# 📚 AlonChat Backend Architecture Documentation
> Complete technical documentation for AlonChat - AI-powered chatbot platform with rich media support

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Features & Differentiators](#core-features--differentiators)
3. [User Flow](#user-flow)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Pricing & Limits](#pricing--limits)
7. [RAG Processing Pipeline](#rag-processing-pipeline)
8. [Chat Engine Architecture](#chat-engine-architecture)
9. [Deployment Channels](#deployment-channels)
10. [Implementation Roadmap](#implementation-roadmap)

---

## System Overview

AlonChat is a Chatbase competitor with unique features:
- **Rich Media Q&A**: Support for images in answers (unique differentiator)
- **Multi-channel Deployment**: Messenger, Instagram, WhatsApp, Web Widget
- **Smart Lead Capture**: Customizable forms triggered by AI
- **Human Handoff**: Seamless transition to human agents
- **Multi-language**: English, Tagalog, Taglish support

**Tech Stack**:
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Next.js API Routes, Supabase
- Database: PostgreSQL with pgvector for embeddings
- AI: OpenAI (GPT-4o-mini), LangChain
- File Processing: PDFParse, Mammoth, Cheerio
- Queue: BullMQ with Redis
- Storage: Supabase Storage

---

## Core Features & Differentiators

### 🌟 Unique Features (vs Chatbase)

1. **Rich Media Q&A Support**
   - Users can add images as answers in Q&A
   - Perfect for menus, product catalogs, service diagrams
   - Chat responses include both text and images

2. **Messenger/Instagram Priority**
   - Direct integration with Meta platforms
   - Native rich media support

3. **Human Handoff System**
   - Automatic escalation after failed attempts
   - Manual request for human agent
   - Seamless conversation continuity

4. **Multi-language RAG**
   - Automatic language detection
   - Responds in user's language (EN/TL/Taglish)

---

## User Flow

### Agent Creation Flow
```
1. Dashboard → Create New Agent
2. Add Sources (No RAG processing yet):
   - Files: Upload PDFs, DOCX, TXT
   - Text: Add text snippets with titles
   - Website: Add URLs for crawling
   - Q&A: Add Q&A pairs with optional images
3. Click "Create Agent" → Triggers RAG processing
4. Agent Ready → Chat, Deploy, Analytics
```

### Key Principle: **Lazy Processing**
- Sources are collected but NOT processed until "Create Agent" is clicked
- Allows users to review and modify sources before processing
- More cost-effective (embeddings generated once)

---

## Database Schema

### Core Tables

```sql
-- Projects (Workspaces) with Pricing Tiers
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  plan_tier ENUM('hobby', 'standard', 'pro', 'enterprise') DEFAULT 'hobby',

  -- Plan Limits
  message_credits_limit INTEGER DEFAULT 2000, -- Monthly limit
  message_credits_used INTEGER DEFAULT 0,      -- Current month usage
  agent_limit INTEGER DEFAULT 1,               -- Max agents
  agent_count INTEGER DEFAULT 0,               -- Current agents
  storage_per_agent_mb INTEGER DEFAULT 33,     -- MB per agent
  actions_per_agent INTEGER DEFAULT 5,         -- Max AI actions
  seat_limit INTEGER DEFAULT 1,                -- Team members

  -- Billing
  billing_cycle_start DATE,
  billing_cycle_end DATE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,

  -- AI Configuration
  model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 500,
  system_prompt TEXT,
  welcome_message TEXT,

  -- Status & Metrics
  status ENUM('draft', 'processing', 'ready', 'error') DEFAULT 'draft',
  last_trained_at TIMESTAMP,
  total_sources INTEGER DEFAULT 0,
  total_size_kb INTEGER DEFAULT 0,
  storage_used_mb FLOAT DEFAULT 0,
  action_count INTEGER DEFAULT 0,
  message_count_total INTEGER DEFAULT 0,
  message_count_month INTEGER DEFAULT 0,

  -- Settings
  visibility ENUM('public', 'private') DEFAULT 'private',
  rate_limit_messages INTEGER DEFAULT 20,
  rate_limit_seconds INTEGER DEFAULT 240,
  allowed_domains TEXT[],
  auto_retrain_enabled BOOLEAN DEFAULT false,
  auto_retrain_hours INTEGER DEFAULT 24,
  language_support TEXT[] DEFAULT ARRAY['english', 'tagalog'],
  human_handoff_enabled BOOLEAN DEFAULT false,
  suggested_questions_enabled BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sources (Raw data before processing)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type ENUM('file', 'text', 'website', 'qa') NOT NULL,
  status ENUM('pending', 'processing', 'ready', 'error') DEFAULT 'pending',

  name VARCHAR(255) NOT NULL,
  raw_data JSONB, -- Stores different data per type
  processed_data JSONB, -- After processing
  file_path TEXT, -- For file storage reference
  website_url TEXT, -- For website sources
  size_kb INTEGER DEFAULT 0,

  metadata JSONB, -- {file_type, crawl_depth, etc}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Q&A Items with Image Support (Our Unique Feature!)
CREATE TABLE qa_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer_text TEXT,
  answer_images JSONB[], -- Array of {url, caption, alt}
  alternative_questions TEXT[], -- For better matching

  question_embedding vector(1536), -- OpenAI embeddings
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX qa_items_embedding_idx ON qa_items
USING ivfflat (question_embedding vector_cosine_ops)
WITH (lists = 100);

-- Chunks for RAG
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  chunk_text TEXT NOT NULL,
  chunk_index INTEGER,
  chunk_embedding vector(1536),

  metadata JSONB, -- {page_number, source_type, etc}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX chunks_embedding_idx ON chunks
USING ivfflat (chunk_embedding vector_cosine_ops)
WITH (lists = 100);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  session_id VARCHAR(255) NOT NULL,
  channel ENUM('widget', 'messenger', 'instagram', 'whatsapp', 'api') DEFAULT 'widget',

  user_info JSONB, -- {ip, location, device, browser, etc}
  lead_id UUID REFERENCES leads(id),

  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  metadata JSONB
);

-- Messages with Rich Media Support
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  images JSONB[], -- For rich responses [{url, caption}]

  sources_used JSONB[], -- Which chunks/QA items were used
  confidence_score FLOAT,
  feedback INTEGER, -- 1 = thumbs up, -1 = thumbs down, 0 = neutral

  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Actions (Lead Forms)
CREATE TABLE ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type ENUM('lead_form', 'appointment', 'notification', 'integration'),

  trigger_type ENUM('message_count', 'keyword', 'intent'),
  trigger_config JSONB, -- {count: 3, keywords: ['pricing'], etc}

  form_fields JSONB[], -- [{name, type, required, options}]

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Captured Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  action_id UUID REFERENCES ai_actions(id),

  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),

  form_data JSONB, -- All captured data

  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage Tracking (For Analytics & Limits)
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  tracking_date DATE NOT NULL,

  message_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  lead_count INTEGER DEFAULT 0,

  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,

  storage_used_mb FLOAT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, agent_id, tracking_date)
);

-- Analytics Events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL, -- 'message_sent', 'lead_captured', 'handoff_triggered'
  event_data JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Team Members (Seats)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  role ENUM('owner', 'admin', 'member') NOT NULL,

  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  platform ENUM('messenger', 'instagram', 'whatsapp', 'slack', 'zapier'),

  config JSONB, -- Platform-specific config
  credentials JSONB, -- Encrypted credentials

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Source Management (Phase 1)
```typescript
// Source Collection - No RAG Processing
POST   /api/agents/[id]/sources/file      // Upload file to storage
POST   /api/agents/[id]/sources/text      // Add text snippet
POST   /api/agents/[id]/sources/website   // Add website URLs
POST   /api/agents/[id]/sources/qa        // Add Q&A with images
GET    /api/agents/[id]/sources           // List all sources
PUT    /api/sources/[id]                  // Update source
DELETE /api/sources/[id]                  // Delete source

// Agent Processing - Triggers RAG
POST   /api/agents/[id]/process           // Process all sources & create embeddings
GET    /api/agents/[id]/status            // Check processing status
POST   /api/agents/[id]/retrain          // Manual retrain
```

### Chat Engine (Phase 2)
```typescript
// Chat Endpoints
POST   /api/chat/[agentId]/message        // Send message
GET    /api/chat/[agentId]/history        // Get conversation history
POST   /api/messages/[id]/feedback        // Rate message (thumbs up/down)
GET    /api/chat/[agentId]/suggestions    // Get suggested questions

// WebSocket for real-time chat
WS     /api/chat/[agentId]/stream        // Real-time chat stream
```

### Settings & Configuration (Phase 3)
```typescript
// Agent Settings
GET    /api/agents/[id]/settings          // Get all settings
PUT    /api/agents/[id]/settings/ai       // Update AI config
PUT    /api/agents/[id]/settings/security // Update security settings
PUT    /api/agents/[id]/settings/general  // Update general settings

// AI Actions (Lead Forms)
POST   /api/agents/[id]/actions           // Create action
GET    /api/agents/[id]/actions           // List actions
PUT    /api/actions/[id]                  // Update action
DELETE /api/actions/[id]                  // Delete action
```

### Analytics & Tracking (Phase 4)
```typescript
// Analytics
GET    /api/agents/[id]/analytics         // Get analytics data
GET    /api/agents/[id]/analytics/export  // Export data

// Activity & Conversations
GET    /api/agents/[id]/conversations     // List conversations
GET    /api/conversations/[id]            // Get conversation details
DELETE /api/conversations/[id]            // Delete conversation

// Leads
GET    /api/agents/[id]/leads             // Get captured leads
POST   /api/leads/[id]/export             // Export to CRM
```

### Deployment Channels (Phase 5)
```typescript
// Priority 1: Meta Platforms
POST   /api/agents/[id]/deploy/messenger  // Connect Facebook Messenger
POST   /api/agents/[id]/deploy/instagram  // Connect Instagram
POST   /api/webhooks/meta/[agentId]       // Webhook for Meta platforms

// Priority 2: Widget
GET    /api/widget/[agentId]/config       // Get widget configuration
POST   /api/widget/[agentId]/customize    // Update appearance
GET    /api/widget/[agentId]/embed.js     // JavaScript embed code

// Priority 3: WhatsApp
POST   /api/agents/[id]/deploy/whatsapp   // Connect WhatsApp Business
POST   /api/webhooks/whatsapp/[agentId]   // WhatsApp webhook

// Priority 4: Custom API
POST   /api/v1/agents/[id]/chat           // REST API endpoint
```

### Usage & Billing
```typescript
// Usage Tracking
GET    /api/projects/[id]/usage           // Get usage statistics
GET    /api/projects/[id]/billing         // Get billing information

// Plan Management
POST   /api/projects/[id]/upgrade         // Upgrade plan
POST   /api/projects/[id]/downgrade       // Downgrade plan
```

---

## Pricing & Limits

### Plan Structure
| Feature | Hobby ($40/mo) | Standard ($150/mo) | Pro ($500/mo) | Enterprise |
|---------|----------------|-------------------|----------------|------------|
| **Message Credits** | 2,000/month | 12,000/month | 40,000/month | Custom |
| **AI Agents** | 1 | 2 | 3 | Custom |
| **AI Actions per Agent** | 5 | 10 | 15 | Unlimited |
| **Storage per Agent** | 33 MB | 100 MB | 500 MB | Unlimited |
| **Team Seats** | 1 | 3 | 5+ | Custom |
| **Analytics** | Basic | Basic | Advanced | Advanced |
| **Support** | Standard | Standard | Priority | Dedicated CSM |
| **Links to Train** | Unlimited | Unlimited | Unlimited | Unlimited |

### Limit Enforcement System
```typescript
// Middleware for checking limits
export async function checkLimits(req: Request) {
  const { projectId, operation, params } = req
  const project = await getProject(projectId)

  const limits = {
    'send_message': () => {
      if (project.message_credits_used >= project.message_credits_limit) {
        throw new LimitError('Monthly message limit reached', 'upgrade_required')
      }
    },
    'create_agent': () => {
      if (project.agent_count >= project.agent_limit) {
        throw new LimitError(`Agent limit (${project.agent_limit}) reached`, 'upgrade_required')
      }
    },
    'upload_file': () => {
      const agent = params.agent
      if (agent.storage_used_mb + params.fileSizeMB > project.storage_per_agent_mb) {
        throw new LimitError(`Storage limit (${project.storage_per_agent_mb}MB) exceeded`, 'upgrade_required')
      }
    },
    'create_action': () => {
      if (params.agent.action_count >= project.actions_per_agent) {
        throw new LimitError(`Action limit (${project.actions_per_agent}) reached`, 'upgrade_required')
      }
    }
  }

  await limits[operation]?.()
}

// Usage tracking
export async function trackUsage(projectId: string, type: string, amount: number = 1) {
  await db.transaction(async (tx) => {
    // Update project usage
    if (type === 'message') {
      await tx.query(
        `UPDATE projects SET message_credits_used = message_credits_used + $1 WHERE id = $2`,
        [amount, projectId]
      )
    }

    // Update daily tracking
    await tx.query(
      `INSERT INTO usage_tracking (project_id, tracking_date, ${type}_count)
       VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (project_id, tracking_date)
       DO UPDATE SET ${type}_count = usage_tracking.${type}_count + $2`,
      [projectId, amount]
    )
  })
}

// Monthly reset job
export async function resetMonthlyUsage() {
  const projects = await db.query(
    `SELECT * FROM projects WHERE DATE_PART('day', billing_cycle_start) = DATE_PART('day', CURRENT_DATE)`
  )

  for (const project of projects) {
    await db.query(
      `UPDATE projects SET message_credits_used = 0 WHERE id = $1`,
      [project.id]
    )
    await db.query(
      `UPDATE agents SET message_count_month = 0 WHERE project_id = $1`,
      [project.id]
    )
  }
}
```

---

## RAG Processing Pipeline

### Overview
When user clicks "Create Agent", all collected sources are processed:

```typescript
export async function processAgent(agentId: string) {
  try {
    // 1. Update agent status
    await updateAgentStatus(agentId, 'processing')

    // 2. Get all sources
    const sources = await getSourcesByAgent(agentId)

    // 3. Process each source type
    const processors = {
      file: processFileSource,
      text: processTextSource,
      website: processWebsiteSource,
      qa: processQASource
    }

    for (const source of sources) {
      await processors[source.type](source)
    }

    // 4. Update agent metrics
    await updateAgentMetrics(agentId)

    // 5. Mark as ready
    await updateAgentStatus(agentId, 'ready')

  } catch (error) {
    await updateAgentStatus(agentId, 'error')
    throw error
  }
}
```

### File Processing
```typescript
async function processFileSource(source: Source) {
  // 1. Download file from storage
  const file = await downloadFromStorage(source.file_path)

  // 2. Extract text based on type
  let text = ''
  switch(source.metadata.file_type) {
    case 'pdf':
      text = await extractPDF(file) // Using pdf-parse
      break
    case 'docx':
      text = await extractDOCX(file) // Using mammoth
      break
    case 'txt':
      text = file.toString('utf-8')
      break
  }

  // 3. Create chunks with overlap
  const chunks = createChunks(text, {
    maxTokens: 1000,
    overlap: 200,
    splitter: 'sentence' // Split by sentences
  })

  // 4. Generate embeddings
  for (const chunk of chunks) {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk.text
    })

    // 5. Store chunk with embedding
    await storeChunk({
      source_id: source.id,
      agent_id: source.agent_id,
      chunk_text: chunk.text,
      chunk_index: chunk.index,
      chunk_embedding: embedding.data[0].embedding,
      metadata: {
        source_type: 'file',
        file_name: source.name,
        page_number: chunk.page
      }
    })
  }

  // 6. Update source status
  await updateSourceStatus(source.id, 'ready')
}
```

### Website Processing
```typescript
async function processWebsiteSource(source: Source) {
  const urls = source.raw_data.urls || []
  const crawlType = source.metadata.crawl_type // 'single', 'crawl', 'sitemap'

  // 1. Gather URLs based on type
  let pagesToProcess = []

  if (crawlType === 'sitemap') {
    const sitemapUrls = await parseSitemap(urls[0])
    pagesToProcess = sitemapUrls
  } else if (crawlType === 'crawl') {
    const crawledUrls = await crawlWebsite(urls[0], { maxDepth: 3 })
    pagesToProcess = crawledUrls
  } else {
    pagesToProcess = urls
  }

  // 2. Deduplicate URLs
  pagesToProcess = [...new Set(pagesToProcess)]

  // 3. Process each page
  for (const url of pagesToProcess) {
    const html = await fetchPage(url)
    const text = extractTextFromHTML(html) // Using cheerio

    // 4. Create chunks and embeddings
    const chunks = createChunks(text, { maxTokens: 1000 })

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.text)

      await storeChunk({
        source_id: source.id,
        agent_id: source.agent_id,
        chunk_text: chunk.text,
        chunk_embedding: embedding,
        metadata: {
          source_type: 'website',
          url: url,
          title: extractTitle(html)
        }
      })
    }
  }
}
```

### Q&A Processing (With Images!)
```typescript
async function processQASource(source: Source) {
  const qaItems = source.raw_data.items || []

  for (const item of qaItems) {
    // 1. Generate embedding for question
    const questionEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: item.question
    })

    // 2. Process images if present
    let processedImages = []
    if (item.answer.images) {
      for (const image of item.answer.images) {
        // Upload to storage if needed
        const imageUrl = await ensureImageStored(image)
        processedImages.push({
          url: imageUrl,
          caption: image.caption,
          alt: image.alt
        })
      }
    }

    // 3. Store Q&A item
    await storeQAItem({
      source_id: source.id,
      agent_id: source.agent_id,
      question: item.question,
      answer_text: item.answer.text,
      answer_images: processedImages,
      alternative_questions: item.additionalQuestions || [],
      question_embedding: questionEmbedding.data[0].embedding
    })

    // 4. Also create text chunk for general RAG
    const combinedText = `Q: ${item.question}\nA: ${item.answer.text}`
    const chunkEmbedding = await generateEmbedding(combinedText)

    await storeChunk({
      source_id: source.id,
      agent_id: source.agent_id,
      chunk_text: combinedText,
      chunk_embedding: chunkEmbedding,
      metadata: {
        source_type: 'qa',
        has_images: processedImages.length > 0
      }
    })
  }
}
```

---

## Chat Engine Architecture

### RAG-based Chat Flow
```typescript
export async function handleChatMessage(
  message: string,
  agentId: string,
  conversationId: string
) {
  // 1. Check rate limits
  await checkRateLimit(agentId)

  // 2. Detect language
  const language = await detectLanguage(message) // en, tl, taglish

  // 3. Generate embedding for user message
  const messageEmbedding = await generateEmbedding(message)

  // 4. Search for relevant content
  const relevantContent = await performRAGSearch(messageEmbedding, agentId)

  // 5. Check for exact Q&A match
  const qaMatch = await findQAMatch(messageEmbedding, agentId)

  // 6. Build context
  const context = buildContext(relevantContent, qaMatch)

  // 7. Generate response
  const response = await generateAIResponse({
    message,
    context,
    language,
    agentConfig: await getAgentConfig(agentId)
  })

  // 8. Handle images if Q&A match has them
  let images = []
  if (qaMatch && qaMatch.answer_images) {
    images = qaMatch.answer_images
  }

  // 9. Store message and response
  await storeMessages(conversationId, message, response, images)

  // 10. Track usage
  await trackUsage(agentId, 'message')

  // 11. Check for triggers (lead forms, handoff)
  await checkTriggers(conversationId, message, response)

  return {
    text: response.text,
    images: images,
    sources: response.sources,
    suggestedQuestions: await getSuggestedQuestions(agentId),
    confidence: response.confidence
  }
}
```

### RAG Search Implementation
```typescript
async function performRAGSearch(embedding: number[], agentId: string) {
  // 1. Vector similarity search in chunks
  const chunkResults = await db.query(
    `SELECT
      id,
      chunk_text,
      metadata,
      1 - (chunk_embedding <=> $1::vector) as similarity
     FROM chunks
     WHERE agent_id = $2
     ORDER BY chunk_embedding <=> $1::vector
     LIMIT 5`,
    [embedding, agentId]
  )

  // 2. Vector similarity search in Q&A items
  const qaResults = await db.query(
    `SELECT
      id,
      question,
      answer_text,
      answer_images,
      1 - (question_embedding <=> $1::vector) as similarity
     FROM qa_items
     WHERE agent_id = $2
     ORDER BY question_embedding <=> $1::vector
     LIMIT 3`,
    [embedding, agentId]
  )

  return {
    chunks: chunkResults.rows,
    qaItems: qaResults.rows
  }
}
```

### Response Generation
```typescript
async function generateAIResponse(params: {
  message: string,
  context: any,
  language: string,
  agentConfig: AgentConfig
}) {
  const { message, context, language, agentConfig } = params

  // Build system prompt
  const systemPrompt = `
    ${agentConfig.system_prompt}

    Language: Respond in ${language === 'tl' ? 'Tagalog' : language === 'taglish' ? 'Taglish (mixed English and Tagalog)' : 'English'}

    Context from knowledge base:
    ${context.chunks.map(c => c.chunk_text).join('\n\n')}

    Q&A pairs:
    ${context.qaItems.map(qa => `Q: ${qa.question}\nA: ${qa.answer_text}`).join('\n\n')}

    Instructions: ${agentConfig.instructions}
  `

  // Generate response
  const completion = await openai.chat.completions.create({
    model: agentConfig.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    temperature: agentConfig.temperature,
    max_tokens: agentConfig.max_tokens
  })

  return {
    text: completion.choices[0].message.content,
    confidence: calculateConfidence(context),
    sources: extractSources(context)
  }
}
```

### Lead Capture & Actions
```typescript
export async function checkTriggers(
  conversationId: string,
  message: string,
  response: any
) {
  const conversation = await getConversation(conversationId)
  const actions = await getAgentActions(conversation.agent_id)

  for (const action of actions) {
    const shouldTrigger = await evaluateTrigger(action, conversation, message)

    if (shouldTrigger) {
      if (action.type === 'lead_form') {
        await triggerLeadForm(conversation, action)
      } else if (action.type === 'human_handoff') {
        await initiateHandoff(conversation)
      } else if (action.type === 'notification') {
        await sendNotification(action, conversation)
      }
    }
  }
}

async function evaluateTrigger(action: AIAction, conversation: any, message: string) {
  switch(action.trigger_type) {
    case 'message_count':
      const messageCount = await getMessageCount(conversation.id)
      return messageCount >= action.trigger_config.count

    case 'keyword':
      const keywords = action.trigger_config.keywords || []
      return keywords.some(k => message.toLowerCase().includes(k.toLowerCase()))

    case 'intent':
      const intent = await detectIntent(message)
      return intent === action.trigger_config.intent
  }
}
```

---

## Deployment Channels

### Priority 1: Facebook Messenger & Instagram
```typescript
// Meta Webhook Handler
export async function handleMetaWebhook(req: Request) {
  const body = await req.json()

  // Verify webhook
  if (!verifyMetaSignature(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Process messages
  for (const entry of body.entry) {
    for (const change of entry.messaging || entry.changes) {
      if (change.message) {
        const agentId = await getAgentByPageId(entry.id)

        // Process message through chat engine
        const response = await handleChatMessage(
          change.message.text,
          agentId,
          change.sender.id
        )

        // Send response back
        await sendMetaMessage({
          recipient: { id: change.sender.id },
          message: {
            text: response.text,
            attachment: response.images ? {
              type: 'image',
              payload: { url: response.images[0].url }
            } : undefined
          }
        })
      }
    }
  }

  return new Response('OK')
}
```

### Priority 2: Widget Embed
```javascript
// Widget embed code
(function() {
  const script = document.createElement('script');
  script.src = 'https://alonchat.com/api/widget/{AGENT_ID}/embed.js';
  script.async = true;
  script.onload = function() {
    AlonChat.init({
      agentId: '{AGENT_ID}',
      position: 'bottom-right',
      primaryColor: '#000000',
      welcomeMessage: 'Hi! How can I help you today?'
    });
  };
  document.head.appendChild(script);
})();
```

### Priority 3: WhatsApp
```typescript
// WhatsApp Business API Integration
export async function handleWhatsAppMessage(req: Request) {
  const { from, body } = await req.json()

  const agentId = await getAgentByWhatsAppNumber(req.headers.get('x-whatsapp-number'))

  const response = await handleChatMessage(body, agentId, from)

  // Send via WhatsApp Business API
  await sendWhatsAppMessage(from, response)
}
```

---

## Implementation Roadmap

### Week 1: Foundation & Source Management
- [ ] Set up database schema with migrations
- [ ] Create API structure and middleware
- [ ] Implement source upload endpoints
- [ ] Build file storage system with Supabase Storage
- [ ] Create Q&A interface with image support

### Week 2: RAG Processing & Chat Engine
- [ ] Implement file text extraction (PDF, DOCX)
- [ ] Build website crawler with deduplication
- [ ] Create chunking algorithm with overlap
- [ ] Set up OpenAI embedding generation
- [ ] Implement vector similarity search
- [ ] Build chat response generation
- [ ] Add multi-language support

### Week 3: Features & Integrations
- [ ] Create lead capture forms system
- [ ] Implement analytics tracking
- [ ] Build human handoff system
- [ ] Add conversation management
- [ ] Create usage tracking and limits
- [ ] Implement auto-retrain scheduling

### Week 4: Deployment & Polish
- [ ] Facebook Messenger integration
- [ ] Instagram integration
- [ ] Widget embed system
- [ ] WhatsApp integration (if time)
- [ ] Performance optimization
- [ ] Testing & bug fixes
- [ ] Documentation

### Week 5: Advanced Features
- [ ] Advanced analytics dashboard
- [ ] CRM integrations
- [ ] Custom API endpoints
- [ ] Bulk operations
- [ ] Export functionality
- [ ] A/B testing for responses

---

## Key Technical Decisions

### 1. **Embedding Model**
- Using OpenAI `text-embedding-3-small` (1536 dimensions)
- Cost-effective and high quality
- Alternative: Consider `text-embedding-ada-002` for even lower cost

### 2. **Vector Database**
- Using PostgreSQL with pgvector extension
- Already integrated with Supabase
- Alternatives considered: Pinecone, Weaviate

### 3. **File Processing**
- PDF: `pdf-parse` library
- DOCX: `mammoth` library
- HTML: `cheerio` for extraction

### 4. **Queue System**
- BullMQ with Redis for background jobs
- Handles: file processing, crawling, retraining

### 5. **Real-time**
- WebSockets for chat (Socket.io)
- Server-Sent Events as fallback

### 6. **Storage**
- Supabase Storage for files and images
- CDN-enabled for fast delivery

---

## Security Considerations

1. **Rate Limiting**
   - Per agent configurable
   - Default: 20 messages per 240 seconds
   - IP-based for anonymous users

2. **Domain Whitelisting**
   - Widget only works on whitelisted domains
   - Prevents unauthorized embedding

3. **API Authentication**
   - Supabase Auth for users
   - API keys for programmatic access
   - JWT tokens for session management

4. **Data Privacy**
   - Conversation data encrypted at rest
   - GDPR compliance with data deletion
   - User consent for lead capture

5. **Input Validation**
   - Zod schemas for all API inputs
   - SQL injection prevention
   - XSS protection in chat responses

---

## Performance Optimizations

1. **Caching Strategy**
   - Redis for frequently accessed data
   - Response caching for common questions
   - Embedding cache to avoid regeneration

2. **Database Optimization**
   - Proper indexes on all foreign keys
   - IVFFlat index for vector similarity
   - Partition large tables by date

3. **Chunking Strategy**
   - 1000 token chunks with 200 token overlap
   - Sentence-based splitting for coherence
   - Metadata preservation for source tracking

4. **CDN Usage**
   - Static assets via Vercel CDN
   - Images via Supabase CDN
   - Widget script cached and minified

5. **Lazy Loading**
   - Sources processed only on demand
   - Embeddings generated in batches
   - Pagination for large result sets

---

## Monitoring & Analytics

### System Metrics
- Response time (p50, p95, p99)
- Error rates by endpoint
- Queue job success/failure rates
- Database query performance

### Business Metrics
- Total conversations per day
- Message volume trends
- Lead conversion rates
- User satisfaction (thumbs up/down ratio)
- Popular questions and topics

### Alerts
- High error rate (> 1%)
- Slow response time (> 2s)
- Queue backlog (> 100 jobs)
- Storage limit approaching
- Credit limit approaching

---

## Testing Strategy

### Unit Tests
- Service layer functions
- Utility functions
- API validators

### Integration Tests
- API endpoints
- Database operations
- External service integrations

### E2E Tests
- Complete chat flow
- Source upload and processing
- Lead capture flow

### Load Testing
- Concurrent chat sessions
- File upload stress test
- Vector search performance

---

## Documentation TODOs
- [ ] API documentation with examples
- [ ] Widget integration guide
- [ ] Platform-specific guides (Messenger, Instagram)
- [ ] Troubleshooting guide
- [ ] Video tutorials

---

## Notes & Decisions

1. **Why Lazy Processing?**
   - Users can review sources before committing
   - Cost-effective (embeddings generated once)
   - Allows bulk optimization

2. **Why Image Support in Q&A?**
   - Unique differentiator from Chatbase
   - Essential for businesses (menus, products)
   - Better user experience

3. **Why Messenger/Instagram Priority?**
   - Large user base in target market
   - Native rich media support
   - Direct business communication

4. **Storage Limits Rationale**
   - 33MB = ~10,000 pages of text
   - Sufficient for most SMB use cases
   - Encourages quality over quantity

5. **Multi-language Strategy**
   - Auto-detect from user message
   - Respond in same language
   - Tagalog/Taglish for Filipino market

---

## Contact & Support

- Repository: [GitHub - AlonChat](#)
- Documentation: [docs.alonchat.com](#)
- Support: support@alonchat.com

---

*Last Updated: [Current Date]*
*Version: 1.0.0*