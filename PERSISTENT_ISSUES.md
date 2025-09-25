# PERSISTENT_ISSUES.md - Recurring Problems & Solutions

This file tracks persistent issues that occur multiple times during development, along with their proven solutions. Update this file whenever an issue takes multiple attempts to fix or recurs after git resets/pushes.

## Purpose
- Document issues that occur repeatedly
- Provide proven solutions for quick resolution
- Prevent time waste on previously solved problems
- Maintain context when reverting to earlier commits

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

*Last Updated: January 25, 2025 - Added Issue #10: Refactoring Inline Editing to Viewer Pattern*
*Remember to update this file when encountering issues that take multiple attempts to resolve!*