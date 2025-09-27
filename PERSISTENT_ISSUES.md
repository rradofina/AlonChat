# PERSISTENT_ISSUES.md - Recurring Problems & Solutions

This file tracks persistent issues that occur multiple times during development, along with their proven solutions. Update this file whenever an issue takes multiple attempts to fix or recurs after git resets/pushes.

## Purpose
- Document issues that occur repeatedly
- Provide proven solutions for quick resolution
- Prevent time waste on previously solved problems
- Maintain context when reverting to earlier commits

---

## CRITICAL ARCHITECTURAL ISSUE: Project-Based vs User-Based Subscriptions

### Date Discovered: January 2025
### Status: ✅ FULLY RESOLVED (January 27, 2025)

### The Problem (FIXED)
The entire codebase had a **fundamental mismatch** between the database design and the code implementation:

- **DATABASE DESIGN**: Subscriptions are tied to PROJECTS (correct)
  - `subscriptions` table has `project_id` column
  - `projects` table has `owner_id` (references user)
  - Relationship: User → owns Project → has Subscription

- **CODE IMPLEMENTATION**: Code assumes subscriptions are tied to USERS (incorrect!)
  - `getUserSubscriptionWithPlan(userId)` tries to find subscription by user ID
  - Code references `project.user_id` but column is actually `project.owner_id`
  - API routes don't know which project context they're in

### Why This Matters
- Each project should have its own subscription (like Vercel, Supabase)
- Users can have multiple projects with different plans
- Current code will NEVER find subscriptions because it's comparing user IDs to project IDs

### Files Being Fixed (Track Changes Here)
```typescript
// ✅ CHANGE #1: lib/plans/plan-service.ts
// OLD: getUserSubscriptionWithPlan(userId) queries .eq('project_id', userId)
// NEW: getProjectSubscriptionWithPlan(projectId) queries .eq('project_id', projectId)
// ALSO ADDED: getUserDefaultProject(userId) to get user's default project
// ALSO ADDED: getUserProjectsWithSubscriptions(userId) for project switcher

// ✅ CHANGE #2: lib/sources/utils.ts
// OLD: project.user_id (doesn't exist!)
// NEW: project.owner_id (correct column name)
// FIXED: calculateStorageUsage now uses project subscription
// FIXED: getStorageLimit now takes projectId (was userId)
// FIXED: validateSourceAccess uses owner_id

// ✅ CHANGE #3: app/api/user/plan/route.ts
// OLD: Gets subscription by user.id directly
// NEW: Gets user's default project first, then project's subscription
// RETURNS: Now includes project info in response

// ✅ CHANGE #4: app/api/agents/[id]/sources/stats/route.ts
// OLD: Passes agent.projects.owner_id to getUserSubscriptionWithPlan
// NEW: Passes agent.project_id to getProjectSubscriptionWithPlan
// SIMPLIFIED: Only queries project_id now

// ✅ CHANGE #5: Added project context tracking (lib/projects/project-context.ts)
// NEW: getCurrentProjectId() - gets from cookie or default
// NEW: setCurrentProjectId() - stores in cookie
// NEW: switchProject() - validates and switches context
// NEW: getUserProjects() - for project switcher UI
```

### Resolution Summary (January 27, 2025)
✅ **ALL ISSUES FIXED:**
1. **Fixed billing page** - Now updates subscriptions table instead of projects
2. **Fixed plans page** - Reads from subscriptions table with plan joins
3. **Fixed onboarding** - Creates free subscription when project is created
4. **Consolidated billing columns** - All billing data now in subscriptions table
5. **Renamed FK constraints** - Changed from workspace_id_fkey to project_id_fkey
6. **Removed duplicate columns** - Cleaned up projects table

### Testing Completed
- ✅ User can see their project's subscription plan
- ✅ Storage limits work correctly per project
- ✅ Agent stats show correct storage limits
- ✅ Multiple projects can have different plans
- ✅ All projects have subscriptions
- ✅ Server runs without errors

### Rollback Instructions
If this breaks things:
1. Git revert to before these changes
2. The old broken code at least doesn't crash (just returns null subscriptions)
3. Users default to starter plan limits

---

## Issue #1: Port 3000 Already in Use

### Symptoms
- Error: "Port 3000 is already in use"
- Next.js dev server fails to start
- Multiple npm run dev processes stuck

### Root Cause
Multiple dev server instances running simultaneously or process not properly terminated

### Solution
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [process_id] /F

# Or kill all Node processes
taskkill /F /IM node.exe

# Then restart
npm run dev
```

### Prevention
- Always use Ctrl+C to properly stop dev server
- Check for running processes before starting new ones

---

## Issue #2: File Preview Showing Placeholder Content

### Symptoms
- File preview displays "Lorem ipsum" instead of actual file content
- Content field missing from API response

### Root Cause
- Frontend using hardcoded placeholder text
- API not including content field in response

### Solution
1. Update API route to include content field:
```typescript
// app/api/agents/[id]/sources/files/route.ts
const formattedSources = sources.map(source => ({
  ...source,
  content: source.content // Include actual content
}))
```

2. Update frontend to use actual content:
```typescript
// Remove hardcoded Lorem ipsum
// Use: file.content || 'No content available'
```

### Files Affected
- `app/api/agents/[id]/sources/files/route.ts`
- `app/dashboard/agents/[id]/sources/files/page.tsx`
- `components/agents/file-viewer.tsx`

---

## Issue #3: Layout Components Getting Covered

### Symptoms
- Top navigation bar disappears
- Left sidebar gets covered
- Full-screen components override app layout

### Root Cause
Using `fixed inset-0` positioning that covers entire viewport

### Solution
Use flex layout within existing app structure:
```typescript
// BAD - Covers everything
<div className="fixed inset-0">

// GOOD - Respects layout
<div className="flex h-full">
```

### Prevention
- Always maintain app layout hierarchy
- Test that navigation elements remain visible
- Use `h-full` instead of `fixed inset-0` for full-height components

---

## Issue #4: Database Migration Conflicts

### Symptoms
- "column already exists" errors
- "relation does not exist" errors
- Mismatched schema between local and production

### Root Cause
- Out of sync migrations
- Manual database changes not tracked
- Git resets causing migration conflicts

### Solution
1. Check current migration status:
```bash
supabase migration list
```

2. Reset to clean state if needed:
```bash
supabase db reset
```

3. Reapply migrations:
```bash
supabase migration up
```

### Prevention
- Always create migrations for schema changes
- Never modify database directly in production
- Keep migration files in git

---

## Issue #5: TypeScript Build Errors After Git Reset

### Symptoms
- Type errors that weren't there before
- "Cannot find module" errors
- JSX syntax errors

### Root Cause
- Dependencies out of sync
- TypeScript cache issues
- Node modules inconsistency

### Solution
```bash
# Full reset procedure
rm -rf node_modules
rm -rf .next
rm package-lock.json
npm install
npm run dev
```

### Prevention
- Run `npm install` after every git pull/reset
- Clear .next cache when switching branches
- Commit package-lock.json changes

---

## Issue #6: Supabase Storage CORS Issues

### Symptoms
- Images not loading from Supabase storage
- CORS errors in browser console
- 403 Forbidden on storage URLs

### Root Cause
- Storage bucket not set to public
- Missing CORS configuration
- Incorrect storage policies

### Solution
1. Ensure bucket is public:
   - Go to Supabase Dashboard > Storage
   - Set bucket to public

2. Check storage policies:
   - Allow SELECT for public access
   - Allow INSERT/UPDATE/DELETE for authenticated users

### Files Affected
- `lib/supabase/storage.ts`
- Storage bucket settings in Supabase dashboard

---

## Issue #7: Jest Worker Errors & App Won't Load After Changes

### Symptoms
- "Jest worker encountered 1 child process exceptions" error
- App doesn't load properly after making code changes
- Fast Refresh fails repeatedly
- Port 3000 gets stuck with zombie processes
- Next.js dev server crashes and creates new instances on different ports

### Root Cause
1. **Next.js 15 Breaking Change**: Dynamic route params must be awaited
2. **Windows SWC Binary Locking**: Jest/SWC worker processes lock binary files on Windows
3. **Cascading Failures**: Param errors → Fast Refresh fails → Full reload → Binary lock → Process crash

### Solution
1. **Fix all dynamic routes to use async/await**:
```typescript
// ❌ OLD (Next.js 14 and below)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // use params.id directly
}

// ✅ NEW (Next.js 15+)
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  // now use params.id
}
```

2. **Windows-specific cleanup before dev**:
```bash
# Add to package.json scripts
"dev:clean": "taskkill /F /IM node.exe 2>nul & rmdir /s /q .next 2>nul & next dev"
```

3. **Emergency recovery**:
```bash
# Kill all processes and clean cache
taskkill /F /IM node.exe
rm -rf .next node_modules/.cache
npm run dev
```

### Prevention
- ALWAYS use async/await for params in Next.js 15+ route handlers
- Use `dev:clean` script when experiencing issues
- Clear .next folder after dependency updates
- Check for zombie processes before starting dev server

### Files Commonly Affected
- All API routes with dynamic segments: `app/api/**/[id]/*.ts`
- All page routes with params: `app/**/[id]/page.tsx`

---

## Issue #8: File Upload & Content Viewing Performance Issues

### Symptoms
- Files show "processing" forever or error out (even tiny 1kb files)
- Content takes 7-8 seconds to load when clicking chevron icon
- PDF shows "PDF processing temporarily disabled for performance"
- Multiple "Download error: 400 Bad Request" in logs
- Storage download taking 400ms-1400ms per request

### Root Cause
**ARCHITECTURAL FLAW**: Processing files on EVERY view instead of ONCE during upload
- Content API was downloading file from storage and processing it every single time
- PDF processing with pdfjs-dist taking 7-8 seconds for large files
- No caching - same file processed repeatedly
- Storage bucket mismatch (source-files vs agent-sources)

### Our Debugging Journey (What NOT to do)
1. **First Wrong Path**: Thought it was database constraints (invalid statuses like 'removed', 'restored')
2. **Second Wrong Path**: Added artificial delays thinking it needed "processing time"
3. **Third Wrong Path**: Fixed storage bucket mismatch but still had performance issues
4. **Fourth Wrong Path**: Tried to optimize PDF processing in content API
5. **CORRECT SOLUTION**: Process files ONCE during upload, store result in database

### Solution
```typescript
// ✅ CORRECT - Process during upload (app/api/agents/[id]/sources/files/route.ts)
const processedFile = await FileProcessor.processFile(file)
const insertData = {
  content: processedFile.content, // Store processed content
  status: 'ready', // Mark as ready immediately
  // ... other fields
}

// ✅ CORRECT - Return stored content instantly (app/api/agents/[id]/sources/[sourceId]/content/route.ts)
if (source.content) {
  return NextResponse.json({
    content: source.content, // Return pre-processed content
    status: source.status,
    metadata: source.metadata
  })
}
```

### Key Learnings
1. **ALWAYS trace the full data flow** before making changes
2. **Don't optimize the wrong part** - we optimized viewing when upload was the problem
3. **Production apps pre-process content** - never process on-demand for viewing
4. **Check existing patterns** - the codebase already had a chunking system we ignored
5. **Simple solutions are better** - storing in DB is simpler than complex caching

### Prevention
- Process heavy operations (PDF parsing, OCR, etc.) ONCE during upload
- Store processed results in database for instant retrieval
- Never do heavy processing in GET endpoints
- Always question if you're solving the RIGHT problem

### Files Affected
- `app/api/agents/[id]/sources/files/route.ts` - Upload endpoint
- `app/api/agents/[id]/sources/[sourceId]/content/route.ts` - Content viewing API
- `lib/sources/file-processor.ts` - File processing logic
- `components/agents/file-viewer.tsx` - Frontend viewer

### Time Wasted
**~2 hours** debugging wrong issues before finding the real architectural problem

---

## Issue #10: Refactoring Inline Editing to Viewer Pattern

### Symptoms
- Inline editing clutters the list view with forms
- Inconsistent UX between Files and Text pages
- Edit functionality mixed with list display logic

### Root Cause
- Initial implementation used inline editing directly in the list
- No separation of concerns between listing and viewing/editing

### Solution
1. **Create separate viewer components** (FileViewer, TextViewer):
```typescript
// Create viewer component with view/edit modes
export function TextViewer({ text, onBack, onDelete, onUpdate }: TextViewerProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  // View and edit logic separated in the viewer
}
```

2. **Remove inline editing from list pages**:
```typescript
// Replace inline edit state with viewer state
const [viewingText, setViewingText] = useState<any | null>(null)

// Change chevron onClick from startEditing to openTextViewer
<button onClick={() => openTextViewer(source)}>
  <ChevronRight />
</button>
```

3. **Render viewer as full-screen overlay**:
```typescript
{viewingText && (
  <div className="fixed inset-0 z-50 bg-white">
    <TextViewer text={viewingText} ... />
  </div>
)}
```

### Key Pattern
- **List Page**: Shows items, handles selection, bulk operations
- **Viewer Component**: Shows single item detail, handles view/edit modes
- **Clean Separation**: List logic stays in page, item logic in viewer

### Files Affected
- `app/dashboard/agents/[id]/sources/text/page.tsx` - Remove inline editing
- `components/agents/text-viewer.tsx` - New viewer component
- `components/agents/file-viewer.tsx` - Reference implementation

### Prevention
- Always separate list views from detail views
- Use dedicated viewer components for item-level operations
- Keep consistent UX patterns across similar features

---

## Adding New Issues

When documenting a new persistent issue, include:
1. **Issue Title** - Clear, searchable description
2. **Symptoms** - What you see when it occurs
3. **Root Cause** - Why it happens
4. **Solution** - Step-by-step fix that works
5. **Prevention** - How to avoid it in the future
6. **Files Affected** - Which files are typically involved

---

## Quick Reference Commands

### Development Reset
```bash
# Full development environment reset
taskkill /F /IM node.exe
rm -rf node_modules .next
npm install
npm run dev
```

### Database Reset
```bash
# Reset local database to clean state
supabase db reset
supabase migration up
```

### Port 3000 Reset
```bash
# Windows - Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID [process_id] /F
```

---

## Issue #9: Soft Delete, Restore, and Permanent Delete for Trained Files

### Symptoms
- Files that were used in training get permanently deleted
- No way to restore files that were accidentally deleted but were part of training
- Training model loses reference to deleted source files

### Root Cause
- No distinction between trained and untrained files for deletion
- All files were hard deleted regardless of training status
- Missing restore functionality for soft-deleted files

### Solution
1. **Add `is_trained` column to sources table**:
```sql
ALTER TABLE sources ADD COLUMN is_trained BOOLEAN DEFAULT FALSE;
```

2. **Implement soft delete for trained files** (app/api/agents/[id]/sources/files/route.ts):
```typescript
// Soft delete trained files
if (trainedIds.length > 0) {
  await supabase.from('sources').update({ status: 'removed' })
}
// Hard delete untrained files
if (untrainedIds.length > 0) {
  await supabase.from('sources').delete()
}
```

3. **Create restore endpoint** (app/api/agents/[id]/sources/restore/route.ts)
4. **Create permanent delete endpoint** (app/api/agents/[id]/sources/permanent-delete/route.ts)
5. **Update UI to show removed files with Restore/Permanently Delete options**

### Files Affected
- `app/api/agents/[id]/sources/files/route.ts` - DELETE logic for soft/hard delete
- `app/api/agents/[id]/sources/restore/route.ts` - New restore endpoint
- `app/api/agents/[id]/sources/permanent-delete/route.ts` - New permanent delete endpoint
- `app/dashboard/agents/[id]/sources/files/page.tsx` - UI for restore/permanent delete

### Prevention
- Always check training status before deleting
- Implement proper soft delete patterns for referenced data
- Provide clear UI distinction between regular delete and permanent delete

---

## Issue #11: Jest Worker Crashes on Windows + OneDrive + Next.js 15

### Symptoms
- "Jest worker encountered 2 child process exceptions, exceeding retry limit" error
- Multiple node.exe zombie processes (20+ processes, using 3GB+ RAM)
- Next.js dev server crashes and restarts infinitely
- Webpack compilation never completes
- App stuck loading forever at localhost:3000

### Root Cause
**CRITICAL: Project location in OneDrive causes file locking conflicts**
1. **OneDrive Sync Conflicts**: Files in `D:\Users\Raymond\OneDrive\` are constantly synced, causing file locks
2. **Jest Worker Process Accumulation**: Next.js 15 uses jest-worker for parallel compilation, creates zombie processes on Windows
3. **Known Next.js 15 Bug**: [GitHub Issue #23519](https://github.com/vercel/next.js/issues/23519) - Windows-specific infinite worker spawning
4. **Memory Exhaustion**: Each crash leaves zombie processes consuming memory until system runs out

### Solution - Comprehensive Windows Fix
**Applied Configuration Changes:**

1. **Created .env.development.local**:
```env
NODE_OPTIONS=--max-old-space-size=4096 --unhandled-rejections=strict
WATCHPACK_POLLING=true
NEXT_DISABLE_SWC_WASM_FALLBACK=1
NEXT_PRIVATE_WORKER_THREADS=false
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING_INTERVAL=100
```

2. **Updated next.config.js**:
```javascript
// Completely disable parallel processing
config.parallelism = 1
config.cache = false // OneDrive causes cache corruption

// Windows file watching
config.watchOptions = {
  poll: true,
  aggregateTimeout: 500,
  followSymlinks: false
}

// Disable all experiments causing issues
config.experiments = {
  layers: false,
  lazyCompilation: false,
  outputModule: false
}
```

3. **Added Windows-specific npm scripts**:
```json
"dev:windows": "taskkill /F /IM node.exe 2>nul & set NODE_OPTIONS=--max-old-space-size=4096 && next dev",
"dev:safe": "set NEXT_PRIVATE_WORKER_THREADS=false && set NODE_OPTIONS=--max-old-space-size=4096 && next dev",
"clean:all": "taskkill /F /IM node.exe 2>nul & rmdir /s /q .next 2>nul & del /q tsconfig.tsbuildinfo 2>nul"
```

### PERMANENT Solution Options
1. **MOVE PROJECT OUT OF ONEDRIVE** (Recommended):
   - Move to `C:\Projects\AlonChat` or any non-synced location
   - OneDrive file locking is incompatible with webpack's file watching

2. **Use WSL2 (Windows Subsystem for Linux)**:
   - Completely avoids Windows file system issues
   - Better performance for Node.js development

3. **Downgrade to Next.js 14.2.x**:
   - More stable on Windows
   - Less aggressive worker spawning

### Emergency Recovery
```bash
# When completely stuck
taskkill /F /IM node.exe
rmdir /s /q .next
rmdir /s /q node_modules\.cache
npm run dev:windows
```

### Prevention
- **DO NOT** develop Next.js projects in OneDrive/Dropbox/Google Drive folders
- Use `npm run dev:windows` instead of `npm run dev` on Windows
- Regularly check for zombie processes: `tasklist | findstr node`
- Add project folder to Windows Defender exclusions

### Files Affected
- `.env.development.local` - Windows-specific environment variables
- `next.config.js` - Webpack configuration for Windows
- `package.json` - Windows-specific scripts

### Time Wasted
**~10 attempts over multiple sessions** trying band-aid fixes before identifying OneDrive as root cause

---

---

## Issue #12: Architecture Refactoring - Phase 1 Complete, Phase 2 Pending

### Date: January 27, 2025
### Status: 🚧 IN PROGRESS (Phase 1 Complete, Phase 2 Not Started)

### The Problem
Monolithic page components with 1000+ lines of code:
- `app/dashboard/agents/[id]/sources/website/page.tsx` - 1,272 lines
- `app/admin/models/page.tsx` - 1,132 lines
- `app/dashboard/agents/[id]/sources/files/page.tsx` - 923 lines
- `app/dashboard/agents/[id]/sources/qa/page.tsx` - 815 lines

### Phase 1 - COMPLETED ✅
Built infrastructure for refactoring:
- **EventBus** (`lib/infrastructure/events/EventBus.ts`) - Real-time event system
- **SSE Endpoint** (`app/api/events/route.ts`) - Server-sent events
- **RealtimeGateway** (`lib/infrastructure/realtime/RealtimeGateway.ts`) - Client SSE manager
- **Domain Entities** (`lib/domain/sources/WebsiteSource.ts`, `lib/domain/chunks/ChunkEntity.ts`)
- **QueueManager** (`lib/infrastructure/queue/QueueManager.ts`) - Unified queue management
- **React Hook** (`features/website-sources/hooks/useWebsiteCrawl.ts`) - Real-time UI updates

### Phase 2 - NOT STARTED ❌
**CRITICAL**: The actual refactoring hasn't begun!
- Monster files are still 1000+ lines
- Business logic still mixed with UI
- No React Query integration
- Real-time infrastructure not connected to UI

### Next Steps When Resuming
1. **READ `REFACTOR_COMPLETE_GUIDE.md`** - Complete implementation guide
2. Test infrastructure at `/test-realtime`
3. Start refactoring `website/page.tsx` first
4. Install React Query
5. Extract components one by one

### Key Files for Reference
- `REFACTOR_COMPLETE_GUIDE.md` - Complete documentation of everything
- `ARCHITECTURE_MIGRATION.md` - Migration strategy
- `app/test-realtime/page.tsx` - Test the infrastructure

### Recovery Instructions
If context is lost:
1. Read `REFACTOR_COMPLETE_GUIDE.md` completely
2. Check TypeScript errors with `npm run typecheck`
3. Test at http://localhost:3000/test-realtime
4. Continue with Phase 2 checklist

---

## Issue #13: Windows Development Server EPIPE Errors

### Date Discovered: September 27, 2025
### Status: ⚠️ RECURRING

### The Problem
Windows development server frequently encounters EPIPE errors with Next.js:
- `[Error: write EPIPE] { errno: -4047, code: 'EPIPE', syscall: 'write' }`
- Jest worker exceptions
- Server continues to work but logs are noisy

### Solution
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Restart dev server
npm run dev
```

### Prevention
- Don't leave dev server running for extended periods
- Restart after major refactoring

---

## Issue #14: TypeScript Errors After Refactoring

### Date Discovered: September 27, 2025
### Status: ✅ DOCUMENTED

### Common Issues After Phase 2 Refactoring
1. **CustomSelect component type mismatch**
   - Solution: Replace with native `<select>` element

2. **usePagination hook property names**
   - Old: `paginatedItems`, `nextPage`, `prevPage`
   - New: `currentItems`, `goToNextPage`, `goToPreviousPage`

3. **FloatingActionBar props mismatch**
   - Solution: Check actual component props, remove unused ones

### Quick Fix Commands
```bash
# See all TypeScript errors
npm run typecheck

# Fix imports
npm run lint -- --fix
```

---

## Issue #15: Phase 2 Refactoring Completed Files

### Date: September 27, 2025
### Status: ✅ COMPLETE FOR 2 FILES

### Successfully Refactored
1. **website/page.tsx**: 1,272 → 104 lines ✅
2. **files/page.tsx**: 923 → 95 lines ✅

### Pattern Established for Remaining Files
- qa/page.tsx (pending)
- models/page.tsx (pending)

### Recovery After Context Loss
```bash
# Start here
cat MASTER_REFACTORING_DOCUMENTATION.md

# Check what's done
ls -la features/website-sources/
ls -la features/file-sources/

# Continue with
wc -l app/dashboard/agents/[id]/sources/qa/page.tsx
wc -l app/dashboard/agents/[id]/sources/models/page.tsx
```

---

*Last Updated: September 27, 2025 - Added Issues #13-15: Phase 2 Refactoring Issues*
*Remember to update this file when encountering issues that take multiple attempts to resolve!*