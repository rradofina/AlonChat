# Chatbase Analysis & AlonChat Implementation Guide

> ⚠️ **HISTORICAL DOCUMENT** - This file contains outdated references to "workspaces" and old database structure.
> The project now uses "projects" instead. See [CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md) for the current structure.

**Based on Screenshot Analysis**
**Date:** September 22, 2025
**Purpose:** Comprehensive analysis of Chatbase.co UI/UX patterns and architecture to guide AlonChat implementation

---

## 1. UI/UX Design Patterns Observed

### 1.1 Overall Design System
- **Color Scheme:** Clean, minimal with white background, black text, subtle grays
- **Primary Actions:** Black buttons with white text
- **Secondary Actions:** Gray outline buttons
- **Accent Color:** Blue/purple gradient for agent cards
- **Typography:** Clean sans-serif (likely Inter or similar)
- **Spacing:** Generous white space, clear visual hierarchy
- **Icons:** Minimal line icons for navigation

### 1.2 Navigation Structure
**Left Sidebar (Collapsible):**
- Logo + Workspace name with plan badge (Free/Hobby/Standard/Pro)
- Main sections:
  - Agents (chatbot list)
  - Usage
  - Workspace settings (expandable submenu)
    - General
    - Members
    - Plans
    - Billing

**Top Header:**
- Breadcrumb navigation: workspace > agent > feature
- Right side: Changelog, Docs, Help, User avatar

**Agent-Level Sidebar (when inside agent):**
- Playground (chat testing)
- Activity (expandable)
  - Chat logs
- Analytics (expandable)
  - Chats
  - Topics
  - Sentiment
- Sources
- Actions
- Contacts
- Deploy
- Settings

### 1.3 Key Pages & Components

#### Dashboard/Agents List
- Grid layout with agent cards
- Each card shows:
  - Gradient background with chat bubble icon
  - Agent name
  - "Last trained X days ago" status
  - Three-dot menu for actions
- "New AI agent" button (black, top-right)
- "Trained" status badge (green dot)

#### Usage Page
- Date range selector (calendar picker)
- Agent filter dropdown
- Metric cards:
  - Credits used (circular progress)
  - Agents used (circular progress)
- Usage history chart (line graph)
- Credits per agent table

#### Workspace Settings
- Tab-based sections
- Form inputs with labels above
- Save buttons (gray, right-aligned)
- Danger zone (red border for delete actions)

#### Plans/Pricing
- Three-tier pricing cards (Hobby, Standard, Pro)
- Monthly/Yearly toggle
- Feature comparison checkmarks
- "Popular" badge on recommended plan

#### Playground (Chat Interface)
- Split view option for comparing models
- Model selector dropdown (GPT-4o Mini)
- Toggle for "Sync" mode
- Temperature/creativity slider
- Chat bubbles with:
  - Avatar icons
  - Message text
  - Emoji reactions
  - Send button with attachment option
- "Powered by Chatbase" footer

#### Analytics
- Date range selector
- Metric cards (Total chats, Messages, Thumbs up/down)
- Charts:
  - Line graph for trends
  - Bar chart for distribution
  - Geographic map for location data
  - Tables for detailed data
- Export functionality

---

## 2. Backend Architecture Requirements

### 2.1 Database Schema (Inferred)

```sql
-- Core Tables
workspaces (
  id, name, url_slug, plan_tier, created_at, owner_id
)

agents/chatbots (
  id, workspace_id, name, avatar_url, system_prompt,
  model_config (json), last_trained_at, status
)

users (
  id, email, name, avatar_url, created_at
)

workspace_members (
  workspace_id, user_id, role (owner/admin/member),
  joined_at
)

-- Knowledge Base
sources (
  id, agent_id, type (website/file/text/qa),
  config (json), status, created_at
)

chunks (
  id, source_id, content, embedding (vector),
  metadata (json)
)

-- Conversations
conversations (
  id, agent_id, session_id, started_at,
  location_data, channel
)

messages (
  id, conversation_id, role (user/assistant),
  content, timestamp, feedback (thumbs up/down)
)

-- Analytics
analytics_events (
  agent_id, event_type, timestamp, metadata
)

-- Billing
subscriptions (
  workspace_id, plan_tier, status,
  credits_used, credits_limit
)
```

### 2.2 Key Features to Implement

#### Authentication & Workspace Management
- Multi-tenant architecture with workspaces
- User roles (Owner, Admin, Member)
- Workspace URL slugs
- Invitation system

#### Agent/Bot Management
- CRUD operations for agents
- Model configuration (GPT-4o Mini, etc.)
- Training status tracking
- Multiple agents per workspace

#### Knowledge Base & Ingestion
- Multiple source types
- Chunking and embedding pipeline
- Training/retraining functionality
- Source management UI

#### Chat/Playground
- Real-time chat interface
- Model comparison mode
- Temperature/creativity controls
- Message feedback (thumbs up/down)
- Chat history/logs

#### Analytics
- Real-time metrics tracking
- Geographic distribution
- Topic analysis
- Sentiment analysis
- Custom date ranges
- Export functionality

#### Deployment
- Embed code generation
- Multiple deployment channels
- Widget customization

#### Billing & Usage
- Credit-based system
- Usage tracking
- Plan limits enforcement
- Billing management

---

## 3. Technical Implementation Stack

### 3.1 Frontend
```typescript
// Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (matching Chatbase's clean aesthetic)
- shadcn/ui components
- Recharts for analytics
- React Hook Form for forms
- Zustand for state management

// Key Components Needed
- Sidebar navigation (collapsible)
- Agent cards grid
- Chat interface
- Analytics charts
- Pricing tables
- Settings forms
- Modal system
```

### 3.2 Backend
```typescript
// Tech Stack
- Supabase (Auth, Database, Storage)
- pgvector for embeddings
- OpenAI API for chat/embeddings
- BullMQ for async jobs
- Redis for caching

// Key Services
- AuthService (workspace-aware)
- AgentService (CRUD, training)
- IngestionService (sources processing)
- ChatService (RAG pipeline)
- AnalyticsService (event tracking)
- BillingService (credits, limits)
```

---

## 4. Implementation Priority (MVP)

### Phase 1: Core Foundation (Week 1-2)
1. **Authentication & Workspaces**
   - User auth (email + Google)
   - Workspace creation
   - Basic navigation UI

2. **Agent Management**
   - Create/edit agents
   - Agent cards display
   - Basic settings

### Phase 2: Knowledge Base (Week 3-4)
1. **Source Ingestion**
   - Website scraping
   - File upload
   - Text input
   - Q&A pairs
   - FB Export (PH differentiator)

2. **Training Pipeline**
   - Chunking & embedding
   - Training status
   - Knowledge preview

### Phase 3: Chat & Testing (Week 5-6)
1. **Playground**
   - Chat interface
   - Model configuration
   - Real-time responses

2. **Basic Analytics**
   - Chat tracking
   - Usage metrics
   - Simple charts

### Phase 4: Deployment & Billing (Week 7-8)
1. **Deployment**
   - Embed widget
   - Messenger integration

2. **Billing**
   - Plan tiers
   - Usage limits
   - Payment integration

---

## 5. PH Market Adaptations

### UI Modifications
- Add Tagalog language toggle
- Include local payment method icons
- Mobile-first responsive design
- Darker mode option for battery saving

### Feature Additions
- FB Messenger export processing (unique)
- Maya/GCash payment integrations
- Lalamove/Grab API actions
- Bilingual responses support
- Media optimization for slow connections

### Pricing Localization
- PHP currency
- Lower price points:
  - Free: 1 bot, 100 messages
  - Starter: ₱299/mo
  - Pro: ₱999/mo
  - Enterprise: Custom

---

## 6. Component Architecture

### Layout Structure
```tsx
// app/layout.tsx
<RootLayout>
  <Sidebar>
    <WorkspaceSelector />
    <Navigation />
  </Sidebar>
  <MainContent>
    <Header>
      <Breadcrumbs />
      <UserMenu />
    </Header>
    <PageContent />
  </MainContent>
</RootLayout>
```

### Key Reusable Components
```typescript
// components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Breadcrumbs.tsx
├── agents/
│   ├── AgentCard.tsx
│   ├── AgentGrid.tsx
│   └── NewAgentButton.tsx
├── chat/
│   ├── ChatInterface.tsx
│   ├── MessageBubble.tsx
│   └── ModelSelector.tsx
├── analytics/
│   ├── MetricCard.tsx
│   ├── UsageChart.tsx
│   └── DataTable.tsx
├── settings/
│   ├── SettingsForm.tsx
│   └── DangerZone.tsx
└── common/
    ├── Button.tsx
    ├── Card.tsx
    └── Modal.tsx
```

---

## 7. API Routes Structure

```typescript
// app/api/
├── auth/
│   ├── login/route.ts
│   └── logout/route.ts
├── workspaces/
│   ├── route.ts (GET, POST)
│   └── [id]/route.ts (GET, PUT, DELETE)
├── agents/
│   ├── route.ts (GET, POST)
│   └── [id]/
│       ├── route.ts (GET, PUT, DELETE)
│       ├── train/route.ts
│       └── chat/route.ts
├── sources/
│   ├── route.ts
│   └── ingest/
│       ├── website/route.ts
│       ├── file/route.ts
│       └── fb-export/route.ts
├── analytics/
│   └── [agentId]/route.ts
└── billing/
    ├── plans/route.ts
    └── subscription/route.ts
```

---

## 8. State Management

```typescript
// stores/
├── authStore.ts       // User session, workspace
├── agentStore.ts      // Current agent, list
├── chatStore.ts       // Conversation state
├── analyticsStore.ts  // Cached metrics
└── uiStore.ts         // Sidebar, modals
```

---

## 9. Development Checklist

### Immediate Actions
- [ ] Set up Next.js project with TypeScript
- [ ] Configure Tailwind to match Chatbase design
- [ ] Install shadcn/ui components
- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Implement auth flow
- [ ] Build layout components
- [ ] Create agent management
- [ ] Implement chat interface
- [ ] Add basic analytics

### Testing Strategy
- [ ] Unit tests for utilities
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Load testing for chat performance
- [ ] Mobile responsiveness testing

---

## 10. Performance Optimizations

### Frontend
- Lazy load heavy components
- Virtualize long lists
- Implement infinite scroll
- Cache analytics data
- Optimize images with next/image

### Backend
- Index database queries
- Cache embeddings
- Queue processing for ingestion
- Rate limiting on API routes
- CDN for static assets

---

This analysis provides a comprehensive blueprint for building AlonChat with Chatbase-inspired design while incorporating PH market optimizations.