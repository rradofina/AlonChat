# 🚀 ALONCHAT COMPLETE REFACTORING GUIDE
## THE SINGLE SOURCE OF TRUTH - DO NOT LOSE THIS FILE!

---

# 📍 CURRENT STATUS: PHASE 1 COMPLETE, PHASE 2 NOT STARTED

**Date**: January 27, 2025
**Context Window Warning**: Use this document as reference if context is lost

---

# 🎯 THE MISSION

Transform AlonChat from monolithic 1000+ line page components into a production-ready, event-driven SaaS architecture using:
- **Domain-Driven Design** (business logic in entities)
- **Event-Driven Architecture** (real-time updates)
- **Queue-Based Processing** (scalable job handling)
- **Layered Architecture** (clear separation of concerns)

---

# 📊 THE PROBLEM FILES (STILL NOT REFACTORED!)

```
app/dashboard/agents/[id]/sources/website/page.tsx - 1,272 lines ❌ NOT TOUCHED
app/admin/models/page.tsx - 1,132 lines ❌ NOT TOUCHED
app/dashboard/agents/[id]/sources/files/page.tsx - 923 lines ❌ NOT TOUCHED
app/dashboard/agents/[id]/sources/qa/page.tsx - 815 lines ❌ NOT TOUCHED
```

**These files still contain:**
- 50+ useState hooks mixed together
- Business logic mixed with UI
- Direct API calls without abstraction
- No real-time updates (polling)
- Massive prop drilling

---

# ✅ PHASE 1: WHAT WE BUILT (COMPLETE)

## 1. EventBus Infrastructure
**File**: `lib/infrastructure/events/EventBus.ts`
**Purpose**: Real-time event propagation using Redis pub/sub
**Key Exports**:
```typescript
import { getEventBus, EventTypes, emitEvent, onEvent } from '@/lib/infrastructure/events/EventBus'

// Event types available:
EventTypes.CRAWL_STARTED
EventTypes.CRAWL_PROGRESS
EventTypes.CRAWL_COMPLETED
EventTypes.CRAWL_FAILED
EventTypes.CHUNK_PROGRESS
EventTypes.EMBED_PROGRESS
```

**Usage Example**:
```typescript
const eventBus = getEventBus()
await eventBus.emit(EventTypes.CRAWL_PROGRESS, {
  jobId: 'job-123',
  sourceId: 'source-456',
  projectId: 'project-789',
  phase: 'processing',
  progress: 50,
  pagesProcessed: 10,
  totalPages: 20,
  timestamp: Date.now()
})
```

## 2. SSE (Server-Sent Events) Endpoint
**File**: `app/api/events/route.ts`
**URL**: `/api/events`
**Purpose**: Stream real-time events to browser
**Query Params**:
- `projectId` - Filter by project
- `sourceId` - Filter by source
- `types` - Event types (comma-separated)

**Client Connection**:
```javascript
const eventSource = new EventSource('/api/events?projectId=xxx')
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}
```

## 3. RealtimeGateway
**File**: `lib/infrastructure/realtime/RealtimeGateway.ts`
**Purpose**: Client-side SSE manager with auto-reconnect
**Features**:
- Automatic reconnection with exponential backoff
- Event subscription management
- Connection state tracking

**Usage**:
```typescript
import { RealtimeGateway } from '@/lib/infrastructure/realtime/RealtimeGateway'

const gateway = new RealtimeGateway({
  projectId: 'project-123',
  onConnect: () => console.log('Connected'),
  onError: (err) => console.error(err)
})

await gateway.connect()
gateway.on('crawl:progress', (data) => {
  console.log('Progress:', data)
})
```

## 4. Domain Entities

### WebsiteSource Entity
**File**: `lib/domain/sources/WebsiteSource.ts`
**Purpose**: Business logic for website sources
**Key Methods**:
```typescript
// Create new source
const source = WebsiteSource.create({
  projectId: 'xxx',
  agentId: 'yyy',
  url: 'https://example.com',
  crawlConfig: { maxPages: 200 }
})

// Business rules
source.canCrawlUrl(url)        // Check if URL can be crawled
source.shouldRecrawl()          // Determine if recrawl needed
source.calculateCrawlPriority() // Get priority score
source.validateCrawlConfig()    // Validate configuration
source.estimateCrawlDuration()  // Estimate time needed
```

### ChunkEntity
**File**: `lib/domain/chunks/ChunkEntity.ts`
**Purpose**: Content chunking logic
**Key Methods**:
```typescript
// Create chunk
const chunk = ChunkEntity.create({
  sourceId: 'xxx',
  content: 'text...',
  position: 0,
  metadata: { namespace: 'standard' }
})

// Chunking strategies
ChunkEntity.splitIntoChunks(text, {
  maxSize: 8000,
  overlap: 400,
  splitOn: 'sentence' // or 'paragraph', 'page', 'token'
})

// Utilities
ChunkEntity.generateHash(content)  // For deduplication
ChunkEntity.estimateTokens(content) // Token counting
```

## 5. QueueManager
**File**: `lib/infrastructure/queue/QueueManager.ts`
**Purpose**: Centralized queue management
**Queues**:
```typescript
import { queueManager, QueueNames } from '@/lib/infrastructure/queue/QueueManager'

// Available queues:
QueueNames.WEBSITE_CRAWL    // Website crawling
QueueNames.CHUNK            // Content chunking
QueueNames.EMBED            // Embedding generation
QueueNames.ADVANCED_TRAINING // Archive processing
QueueNames.INTEGRATION      // Webhooks/integrations

// Add jobs
await queueManager.addWebsiteCrawlJob({
  sourceId: 'xxx',
  agentId: 'yyy',
  projectId: 'zzz',
  url: 'https://example.com',
  maxPages: 100
})

// Get statistics
const stats = await queueManager.getQueueStats(QueueNames.WEBSITE_CRAWL)
```

## 6. React Hook for Real-time
**File**: `features/website-sources/hooks/useWebsiteCrawl.ts`
**Purpose**: Connect React to real-time updates
**Usage**:
```typescript
import { useWebsiteCrawl } from '@/features/website-sources/hooks/useWebsiteCrawl'

function Component() {
  const {
    isConnected,
    crawlProgress,    // Array of active crawls
    startCrawl,       // Start new crawl
    isCrawling,       // Check if source is crawling
    getProgress,      // Get progress for source
  } = useWebsiteCrawl({
    projectId: 'xxx',
    autoConnect: true,
    onProgress: (progress) => console.log(progress),
    onComplete: (sourceId) => console.log('Done:', sourceId)
  })

  // Start crawl
  await startCrawl('https://example.com', {
    sourceId: 'xxx',
    agentId: 'yyy',
    projectId: 'zzz',
    maxPages: 100
  })
}
```

## 7. Modified Files

### website-processor.ts
**File**: `lib/queue/website-processor.ts`
**Changes**: Now emits EventBus events
**Events Emitted**:
- `CRAWL_STARTED` - When crawl begins
- `CRAWL_PROGRESS` - During crawling (each page)
- `CRAWL_COMPLETED` - On success
- `CRAWL_FAILED` - On error

## 8. Test Page
**File**: `app/test-realtime/page.tsx`
**URL**: http://localhost:3000/test-realtime
**Purpose**: Test real-time infrastructure
**Features**:
- Connection status indicator
- Live crawl progress display
- Test event emission button

---

# 🔴 PHASE 2: WHAT NEEDS TO BE DONE (NOT STARTED!)

## CRITICAL: The Monster Files Are Still Monsters!

### Task 1: Refactor website/page.tsx (1,272 lines)
**File**: `app/dashboard/agents/[id]/sources/website/page.tsx`

**Split Into**:
```
features/website-sources/
  ├── components/
  │   ├── WebsiteSourceList.tsx (200 lines)
  │   ├── WebsiteSourceCard.tsx (150 lines)
  │   ├── AddWebsiteForm.tsx (150 lines)
  │   ├── CrawlProgressBar.tsx (100 lines)
  │   └── WebsiteFilters.tsx (80 lines)
  ├── hooks/
  │   ├── useWebsiteSources.ts (use React Query)
  │   └── useAddWebsite.ts
  ├── containers/
  │   └── WebsiteSourcesContainer.tsx (150 lines)
  └── types.ts

app/dashboard/agents/[id]/sources/website/page.tsx (50 lines only!)
```

**Extract Business Logic To Domain**:
- URL validation → WebsiteSource.validateUrl()
- Crawl decisions → WebsiteSource.shouldRecrawl()
- Progress calculation → Move to service

**Connect Real-time**:
- Use useWebsiteCrawl hook
- Remove polling code
- Add progress bars that update instantly

### Task 2: Add React Query
```bash
npm install @tanstack/react-query
```

**Create Provider**:
```typescript
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Replace Manual Fetching**:
```typescript
// Before (in page.tsx)
const [sources, setSources] = useState([])
const [loading, setLoading] = useState(true)
useEffect(() => {
  fetch('/api/sources')...
}, [])

// After (with React Query)
const { data: sources, isLoading } = useQuery({
  queryKey: ['sources', agentId],
  queryFn: () => fetchSources(agentId)
})
```

### Task 3: Create Application Layer

**Create Use Cases**:
```
lib/application/
  ├── sources/
  │   ├── AddWebsiteSource.usecase.ts
  │   ├── DeleteSource.usecase.ts
  │   ├── RecrawlWebsite.usecase.ts
  │   └── GetSourcesWithProgress.query.ts
  └── agents/
      └── GetAgentSettings.query.ts
```

**Example Use Case**:
```typescript
// lib/application/sources/AddWebsiteSource.usecase.ts
export class AddWebsiteSourceUseCase {
  async execute(dto: AddWebsiteDTO) {
    // 1. Validate permissions
    // 2. Check plan limits
    // 3. Create domain entity
    // 4. Save to database
    // 5. Queue crawl job
    // 6. Return result
  }
}
```

### Task 4: Create Workers

**Move Processing Out of API Routes**:
```
workers/
  ├── crawlWorker.ts (from website-processor.ts)
  ├── chunkWorker.ts (from ChunkManager)
  ├── embedWorker.ts (new)
  └── deploy.sh
```

### Task 5: Refactor Other Monster Files

**files/page.tsx (923 lines)**:
- Extract FileUploadZone component
- Extract FilesList component
- Create useFileUpload hook
- Move processing to FileProcessor service

**qa/page.tsx (815 lines)**:
- Extract QuestionForm component
- Extract QuestionsList component
- Create useQAManagement hook
- Move to domain entity

**models/page.tsx (1,132 lines)**:
- Extract ModelsList component
- Extract ModelForm component
- Create useModelsAdmin hook
- Move validation to domain

---

# 🧪 TESTING PROCEDURES

## Test Real-time Infrastructure

### 1. Manual Test
```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Test SSE
curl -N http://localhost:3000/api/events

# Terminal 3: Emit test event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"type": "crawl:progress", "data": {"sourceId": "test", "progress": 50}}'
```

### 2. Browser Test
1. Navigate to http://localhost:3000/test-realtime
2. Check connection status (green dot)
3. Click "Emit Test Event"
4. Open console, verify event logged
5. Start actual crawl from website sources
6. Return to test page, see real-time progress

### 3. Integration Test
```typescript
// tests/realtime.test.ts
import { getEventBus } from '@/lib/infrastructure/events/EventBus'

test('EventBus emits and receives', async () => {
  const eventBus = getEventBus()
  const received = []

  await eventBus.subscribe('test:event', (data) => {
    received.push(data)
  })

  await eventBus.emit('test:event', { test: true })
  await new Promise(r => setTimeout(r, 100))

  expect(received).toHaveLength(1)
  expect(received[0].test).toBe(true)
})
```

---

# 🔧 TROUBLESHOOTING

## Common Issues & Solutions

### Issue: "Redis not available" warnings
**Solution**: Install Redis locally or use Docker
```bash
docker run -d -p 6379:6379 redis
```

### Issue: SSE connection drops
**Solution**: Already handled with auto-reconnect, check RealtimeGateway logs

### Issue: TypeScript errors in database.types.ts
**Solution**: Regenerate types
```bash
npm run db:generate
```

### Issue: Events not received in UI
**Debug Steps**:
1. Check EventBus connection: `eventBus.isConnected()`
2. Check SSE connection in Network tab
3. Verify authentication (SSE requires auth)
4. Check browser console for errors

### Issue: Queue jobs not processing
**Debug Steps**:
1. Check Redis connection
2. Verify worker is running: `initWebsiteWorker()`
3. Check queue stats: `queueManager.getQueueStats()`

---

# 📝 ENVIRONMENT VARIABLES

Required in `.env.local`:
```bash
# Redis (already configured)
REDIS_URL=redis://default:2ZvLfUMGeSw7pYo5g1mT7q8ZhF8zHvID@redis-16887.c295.ap-southeast-1-1.ec2.redns.redis-cloud.com:16887

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://owbwwkgiyvylmdvuiwsn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Optional SSE config
NEXT_PUBLIC_SSE_RECONNECT_INTERVAL=3000
NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS=10
```

---

# 📋 PHASE 2 IMPLEMENTATION CHECKLIST

## Week 2: Component Extraction
- [ ] Install React Query
- [ ] Create QueryClient provider
- [ ] Extract WebsiteSourceList component
- [ ] Extract AddWebsiteForm component
- [ ] Extract CrawlProgressBar component
- [ ] Create useWebsiteSources hook with React Query
- [ ] Connect useWebsiteCrawl for real-time
- [ ] Reduce page.tsx to <100 lines

## Week 3: Business Logic Extraction
- [ ] Move URL validation to domain
- [ ] Move crawl rules to domain
- [ ] Create AddWebsiteSource use case
- [ ] Create DeleteSource use case
- [ ] Move API calls to services
- [ ] Remove business logic from components

## Week 4: Remaining Files
- [ ] Refactor files/page.tsx (923 lines)
- [ ] Refactor qa/page.tsx (815 lines)
- [ ] Refactor models/page.tsx (1,132 lines)
- [ ] Extract all shared components

## Week 5: Workers & Production
- [ ] Create dedicated worker files
- [ ] Deploy workers separately
- [ ] Add monitoring
- [ ] Load testing
- [ ] Documentation

---

# 🚨 CRITICAL REMINDERS

1. **THE MONSTER FILES ARE STILL MONSTERS** - Phase 1 built infrastructure but didn't touch the actual problem files!

2. **Real-time is ready but not connected** - We have EventBus/SSE but the UI doesn't use it yet

3. **Domain entities exist but aren't used** - WebsiteSource entity is ready but page.tsx still has inline logic

4. **QueueManager is ready but not integrated** - Still using old website-processor.ts patterns

5. **React Query not installed** - Needed for proper data fetching

---

# 🎯 NEXT IMMEDIATE STEPS

When you return to this project:

1. **Test the infrastructure** (5 mins)
   - npm run dev
   - Navigate to /test-realtime
   - Verify EventBus works

2. **Start with website/page.tsx** (most critical)
   - Create features/website-sources/ folder
   - Extract first component (WebsiteSourceList)
   - Connect useWebsiteCrawl hook

3. **Install React Query**
   - npm install @tanstack/react-query
   - Add provider to layout
   - Replace one fetch with useQuery

4. **Continue extraction**
   - One component at a time
   - Test after each extraction
   - Commit frequently

---

# 📚 FILE REFERENCE

## Created Files (Phase 1)
```
lib/infrastructure/events/EventBus.ts - Real-time events
lib/infrastructure/realtime/RealtimeGateway.ts - SSE client
lib/infrastructure/queue/QueueManager.ts - Queue management
lib/domain/sources/WebsiteSource.ts - Website business logic
lib/domain/chunks/ChunkEntity.ts - Chunking logic
app/api/events/route.ts - SSE endpoint
features/website-sources/hooks/useWebsiteCrawl.ts - React hook
app/test-realtime/page.tsx - Test page
ARCHITECTURE_MIGRATION.md - Migration guide
REFACTOR_COMPLETE_GUIDE.md - This file
```

## Modified Files
```
lib/queue/website-processor.ts - Added EventBus events
```

## Files To Refactor (Phase 2)
```
app/dashboard/agents/[id]/sources/website/page.tsx - 1,272 lines
app/admin/models/page.tsx - 1,132 lines
app/dashboard/agents/[id]/sources/files/page.tsx - 923 lines
app/dashboard/agents/[id]/sources/qa/page.tsx - 815 lines
```

---

# 🏁 SUCCESS CRITERIA

Phase 1 ✅:
- [x] EventBus working
- [x] SSE streaming events
- [x] Domain entities created
- [x] QueueManager ready
- [x] React hook for real-time

Phase 2 ❌:
- [ ] website/page.tsx < 100 lines
- [ ] All business logic in domain layer
- [ ] React Query for data fetching
- [ ] Real-time progress in UI
- [ ] Zero prop drilling

Phase 3 (Future):
- [ ] Workers deployed separately
- [ ] Monitoring dashboard
- [ ] 100% test coverage
- [ ] < 200ms response times
- [ ] Handle 10,000 concurrent users

---

# 🔄 RECOVERY INSTRUCTIONS

If you lose all context and need to continue:

1. Read this file completely
2. Check ARCHITECTURE_MIGRATION.md for additional details
3. Run `npm run typecheck` to see current errors
4. Navigate to /test-realtime to verify infrastructure
5. Continue with Phase 2 checklist
6. Focus on website/page.tsx first (highest priority)

---

**REMEMBER**: The infrastructure is built but the actual refactoring hasn't started! The 1,272-line file is still 1,272 lines!

**Last Updated**: January 27, 2025, 11:30 PM
**Author**: Claude
**Status**: Phase 1 Complete, Phase 2 Not Started
**Priority**: Start Phase 2 immediately when work resumes