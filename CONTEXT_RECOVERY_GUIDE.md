# 🚨 CRITICAL CONTEXT RECOVERY GUIDE 🚨
## If Context Window Fills Up, Start Here!

Last Updated: 2025-09-27 01:53 UTC
Current Phase: **Phase 2 - Refactoring Monster Files**

## 🎯 CURRENT STATE SUMMARY

### What We're Doing
Converting 1000+ line page files into modular, production-ready components following Domain-Driven Design (DDD) and event-driven architecture.

### Progress So Far
- ✅ **Phase 1 Complete**: Infrastructure built (EventBus, SSE, Domain entities, QueueManager)
- ✅ **Website Sources Refactored**: 1,272 lines → 7 focused components (~150 lines each)
- 🔄 **Currently Working**: files/page.tsx (923 lines)
- ⏳ **Pending**: qa/page.tsx, models/page.tsx

## 📁 KEY FILE LOCATIONS

### Infrastructure (Phase 1 - COMPLETE)
```
lib/
├── infrastructure/
│   ├── events/EventBus.ts          # Redis pub/sub system
│   ├── realtime/RealtimeGateway.ts # SSE client manager
│   └── queue/QueueManager.ts       # Centralized job handling
├── domain/
│   ├── sources/WebsiteSource.ts    # Business logic
│   └── chunks/ChunkEntity.ts       # Content chunking
└── providers/
    └── query-provider.tsx           # React Query setup
```

### Refactored Components (Phase 2)
```
features/
└── website-sources/                # ✅ COMPLETE
    ├── hooks/
    │   ├── useWebsiteSources.ts   # React Query data fetching
    │   └── useWebsiteCrawl.ts     # Real-time updates
    └── components/
        ├── AddWebsiteForm.tsx      # Add website UI
        ├── WebsiteSourceCard.tsx   # Individual source display
        ├── WebsiteSourceStatus.tsx # Status indicators
        └── WebsiteSourcesList.tsx  # List management
```

### Files Being Refactored
```
app/dashboard/agents/[id]/sources/
├── website/
│   ├── page.tsx                   # ✅ Refactored (was 1,272 lines → now 104)
│   └── page-original.tsx.bak      # Backup of original
├── files/
│   └── page.tsx                   # 🔄 IN PROGRESS (923 lines)
├── qa/
│   └── page.tsx                   # ⏳ TODO (unknown size)
└── models/
    └── page.tsx                   # ⏳ TODO (unknown size)
```

## 🏗️ REFACTORING PATTERN

### For Each Monster File:
1. **Analyze Structure** - Count lines, identify components
2. **Create Feature Folder** - `features/{feature-name}/`
3. **Extract Hooks** - Data fetching with React Query
4. **Extract Components** - UI components (150 lines max each)
5. **Add Real-time** - Connect to EventBus/SSE
6. **Update Page** - Minimal orchestration only
7. **Test & Document** - Ensure everything works

### Standard Component Structure:
```typescript
features/{feature}/
├── hooks/
│   ├── use{Feature}.ts         # Main data hook
│   └── use{Feature}Realtime.ts # Real-time updates
├── components/
│   ├── {Feature}Form.tsx       # Add/edit forms
│   ├── {Feature}Card.tsx       # Individual item display
│   ├── {Feature}List.tsx       # List management
│   └── {Feature}Status.tsx     # Status indicators
└── types.ts                    # TypeScript interfaces
```

## 🔧 TECHNICAL STACK

### Core Dependencies
- **Next.js 15.5.4** - App router with dynamic routes
- **@tanstack/react-query** - Server state management
- **Redis** - Pub/sub via EventBus
- **BullMQ** - Job queue processing
- **TypeScript** - Full type safety
- **Zod** - Runtime validation

### Key Patterns
- **React Query** for all data fetching (no useState for server data)
- **EventBus** for real-time updates (no polling)
- **Domain entities** for business logic (not in components)
- **Feature folders** for organization (not scattered files)

## 🚀 IMMEDIATE NEXT STEPS

### If Continuing files/page.tsx Refactoring:
```bash
# 1. Create feature structure
mkdir -p features/file-sources/hooks
mkdir -p features/file-sources/components

# 2. Files to create:
- features/file-sources/hooks/useFileSources.ts
- features/file-sources/hooks/useFileUpload.ts
- features/file-sources/components/FileUploadForm.tsx
- features/file-sources/components/FileSourceCard.tsx
- features/file-sources/components/FileSourcesList.tsx

# 3. Current analysis shows files/page.tsx has:
- File upload with drag & drop
- File list with preview
- Delete/restore functionality
- File type filtering
- Pagination
```

### If Starting Fresh After Context Loss:
1. Check `git status` to see current changes
2. Read this file completely
3. Check REFACTORING_PROGRESS.md for detailed status
4. Continue from "IMMEDIATE NEXT STEPS" above

## ⚠️ CRITICAL REMINDERS

### NEVER:
- ❌ Create files unless absolutely necessary
- ❌ Use quick fixes or temporary solutions
- ❌ Mix concerns in components
- ❌ Use polling for updates (use EventBus)
- ❌ Put business logic in UI components

### ALWAYS:
- ✅ Follow the established pattern
- ✅ Use React Query for data fetching
- ✅ Keep components under 200 lines
- ✅ Document heavily as you go
- ✅ Test after each major change
- ✅ Update this file if making significant progress

## 🔍 HOW TO VERIFY CURRENT STATE

```bash
# Check what's been done
ls -la features/website-sources/     # Should exist with components
ls -la lib/infrastructure/           # Should have EventBus, etc.

# Check current work
wc -l app/dashboard/agents/[id]/sources/files/page.tsx  # Should be 923 lines

# Check git status
git status                           # See all changes

# Test the app
npm run dev                          # Should compile and run
```

## 📊 METRICS TO TRACK

### Before Refactoring:
- website/page.tsx: 1,272 lines ✅ DONE
- files/page.tsx: 923 lines 🔄 IN PROGRESS
- qa/page.tsx: ??? lines ⏳ TODO
- models/page.tsx: ??? lines ⏳ TODO

### After Refactoring Target:
- Each page.tsx: <150 lines (orchestration only)
- Each component: <200 lines (single responsibility)
- Each hook: <100 lines (focused logic)

## 🆘 RECOVERY COMMANDS

```bash
# If completely lost:
cat CONTEXT_RECOVERY_GUIDE.md         # You are here
cat REFACTORING_PROGRESS.md          # Detailed progress
cat REFACTOR_COMPLETE_GUIDE.md       # Original plan
cat PERSISTENT_ISSUES.md             # Known issues

# Check recent work:
git diff --stat                      # See changed files
git log --oneline -10               # Recent commits

# Find refactored components:
find features -name "*.tsx" -type f  # All new components
find features -name "*.ts" -type f   # All new hooks
```

## 💡 KEY INSIGHTS LEARNED

1. **Real-time is Essential**: EventBus + SSE eliminates polling
2. **React Query Simplifies**: No manual loading/error states
3. **Small Components Scale**: 150-line files are maintainable
4. **TypeScript Everything**: Full type safety prevents bugs
5. **Document Constantly**: Context windows fill fast

## 🎯 SUCCESS CRITERIA

### This refactoring is complete when:
1. All page.tsx files are <150 lines
2. All components are in feature folders
3. React Query handles all data fetching
4. EventBus provides real-time updates
5. Full TypeScript coverage with no errors
6. Tests pass and app runs smoothly

---

**REMEMBER**: This is a production SaaS refactoring, not a quick fix. Quality over speed. If you lose context, start here and continue the systematic refactoring process.