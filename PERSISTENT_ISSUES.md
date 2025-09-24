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

*Last Updated: [Auto-update when adding new issues]*
*Remember to update this file when encountering issues that take multiple attempts to resolve!*