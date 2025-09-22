# AlonChat Development Changelog

## Purpose
This changelog documents ALL development activities, decisions, reverts, errors, and reasoning throughout the AlonChat project. It serves as a development journal to understand why things happened, what was tried, what failed, and what succeeded.

---

## [Session 4] - 2025-09-22 (Current)

### 🎨 Complete UI Redesign: Source-First Agent Creation
**Inspiration:** Analyzed 6 Chatbase screenshots showing their source-ingestion flow
**Decision:** Pivoted from wizard approach to source-first approach

**Created New Agent Creation Flow:**
1. `app/dashboard/agents/new/page.tsx` - Tabbed source collection page
2. Left sidebar with source type tabs (Files, Text, Website, Q&A)
3. Right sidebar showing accumulated sources with size tracking
4. Agent name input at the top of right sidebar
5. Create agent button only enabled when sources are added

**New Components Created:**
- `components/sources/file-source-input.tsx` - Drag & drop file upload
- `components/sources/text-source-input.tsx` - Rich text editor with formatting
- `components/sources/website-source-input.tsx` - URL crawling with advanced options
- `components/sources/qa-source-input.tsx` - Q&A pairs with expandable inputs

**UI Patterns Implemented:**
- Tabbed navigation matching Chatbase exactly
- Size tracking showing KB used out of 400KB limit
- Progress bar for total size consumption
- Colorful gradient cards for empty state
- Source type icons and counters

**Updated Components:**
- `NewAgentButton` now links to `/dashboard/agents/new` instead of opening wizard
- Dashboard empty state now shows gradient cards like Chatbase
- Removed wizard modal approach completely

**Why This Change:**
- Source-first approach is more intuitive
- Users can see all source options upfront
- Better matches competitor patterns (Chatbase)
- Clearer progress tracking with size limits

---

## [Session 3] - 2025-09-22

### 🔄 Port Conflicts & Server Restart Issues
**Problem:**
- Ports 3000 and 3001 were both in use with hanging processes
- Multiple redirect loops between `/dashboard` and `/onboarding`
- Server wouldn't restart cleanly

**Actions Taken:**
1. Killed processes on both ports using `taskkill //PID {pid} //F`
2. Restarted dev server multiple times
3. Server auto-selected port 3001 when 3000 was blocked

**Resolution:**
- Successfully killed all processes and restarted on port 3001
- This is why we sometimes see port 3000 and sometimes 3001 in the logs

### 🐛 Critical Bug: createServerClient Naming Conflict
**Problem:**
- Build error: "the name `createServerClient` is defined multiple times"
- Function was both imported from '@supabase/ssr' AND exported with same name

**Root Cause:**
- In `lib/supabase/server.ts`, we were importing `createServerClient` and also naming our export function `createServerClient`

**Fix Applied:**
```typescript
// Changed from:
export async function createServerClient()
// To:
export async function createClient()
```

**Files Updated:**
- `lib/supabase/server.ts` - Renamed function
- `app/page.tsx` - Updated import
- `app/dashboard/page.tsx` - Updated import
- `app/dashboard/layout.tsx` - Updated import
- `app/auth/callback/route.ts` - Updated import

**Why This Happened:**
- Initial code generation didn't catch the naming conflict
- TypeScript/Next.js compilation caught it at runtime

### 🔐 Google OAuth Configuration
**Problem:**
- Error: "Unsupported provider: provider is not enabled"
- Google sign-in button redirected to error page

**Steps to Fix:**
1. Enabled Google provider in Supabase dashboard
2. Created Google Cloud Console OAuth credentials
3. Added authorized JavaScript origins: `http://localhost:3000`
4. Added redirect URI: `https://owbwwkgiyvylmdvuiwsn.supabase.co/auth/v1/callback`

**Note:** The "continue to owbwwkgiyvylmdvuiwsn.supabase.co" message looks unprofessional but is normal for development with Supabase URLs

### 📊 Database: Missing Profiles Table
**Problem:**
- Error: "Database error saving new user"
- Profiles table didn't exist for storing user data after OAuth

**Solution Created:**
- Migration: `002_fix_auth_profiles.sql`
- Created profiles table with RLS policies
- Added trigger to auto-create profile on user signup
- This ensures every authenticated user gets a profile record

### 🔄 Redirect Loop Hell
**Problem:**
- Infinite redirects between `/dashboard` and `/onboarding`
- Browser error: ERR_TOO_MANY_REDIRECTS

**Root Causes:**
1. Workspace query used `.or()` with incorrect syntax for joining conditions
2. Query was returning empty even when workspaces existed
3. Both pages were redirecting to each other when checks failed

**Fix:**
```typescript
// Changed from complex OR query:
.or(`owner_id.eq.${user.id},workspace_members.user_id.eq.${user.id}`)
// To simple equality:
.eq('owner_id', user.id)
```

**Why We Removed the Complex Query:**
- The workspace_members join wasn't set up properly
- For MVP, we only need to check owner_id
- Can add member support later with proper joins

### 🏢 Workspace Creation Issues
**Problem:**
- Duplicate key constraint violations
- Multiple workspaces created during redirect loops
- URL slug conflicts

**What Happened:**
1. First attempt used hardcoded slug from user ID substring
2. Redirect loop caused multiple creation attempts
3. Each attempt hit duplicate constraint

**Fix:**
- Added timestamp-based unique slug generation
- Now creates: `{userId-substring}-{timestamp}`
- Prevents duplicates even if function runs multiple times

### 📁 Sample Folder Documentation
**Contents:** 46 Chatbase screenshots showing:
- Agent management UI with gradient cards
- Chat playground with split view
- Analytics dashboards
- Source ingestion interfaces
- Deployment options

**Purpose:** Reference for UI/UX implementation to match Chatbase patterns

### ✅ Successfully Committed & Pushed
**Commit:** `4a39203` - "Fix authentication flow and enable Google OAuth"
**Changes:**
- 8 files changed
- 129 insertions, 19 deletions
- New files: `app/onboarding/page.tsx`, `002_fix_auth_profiles.sql`

### 🚀 Agent Detail Pages Implementation (Completed)
**Problem:**
- Clicking on agent cards didn't navigate to detail pages
- Bot icon import was at bottom of dashboard page file

**Created:**
1. `app/dashboard/agents/[id]/page.tsx` - Agent overview with stats and quick action cards
2. `app/dashboard/agents/[id]/playground/page.tsx` - Real-time chat testing interface

**Features Added:**
- Agent detail page shows stats (conversations, sources, status)
- Quick action cards for Playground, Knowledge Base, Analytics, Settings
- Playground with mock chat responses
- Agent settings panel showing model, temperature, max tokens
- Welcome messages and suggested questions support

**Fixed:**
- Moved Bot icon import to top of dashboard page
- Navigation now works correctly to `/dashboard/agents/{id}`

### 📚 Source Ingestion Components (Completed)
**Created Components:**
1. `app/dashboard/agents/[id]/sources/page.tsx` - Knowledge base management page
2. `components/sources/add-source-button.tsx` - Button to open add source modal
3. `components/sources/add-source-modal.tsx` - Multi-type source addition modal
4. `components/sources/sources-list.tsx` - List view with status and actions

**Features:**
- Three source types: Website (with crawl depth), Files (PDF/DOC/TXT), Facebook Export
- Source status tracking (pending, processing, ready, error)
- Reprocess failed sources functionality
- Delete sources with confirmation
- Stats cards showing total sources by type
- Facebook export instructions in modal

**UI Patterns:**
- Modal with back navigation between steps
- File upload with drag-and-drop support
- Status indicators with icons and colors
- Error message display with retry option

---

## [Session 2] - 2025-09-21

### 🚀 Initial MVP Build
**Created:**
- Full authentication system with Supabase
- Dashboard layout with sidebar
- Agent management components
- Database schema with 12 tables
- Middleware for protected routes

**Key Decisions:**
- Used Next.js 14 App Router for modern React features
- Chose Supabase over Firebase for open-source PostgreSQL
- Implemented workspace-based multi-tenancy from the start

---

## [Session 1] - 2025-09-18

### 📋 Project Setup
**Created:**
- AlonChat PRD document
- Claude code generation guide
- Competitive analysis of Chatbase
- GitHub repository initialization

**Strategic Decisions:**
- Target Philippine SME market
- Focus on Facebook Messenger export processing as differentiator
- Price in PHP (₱299-₱999) vs Chatbase's USD pricing

---

## Development Patterns Learned

### ✅ What Works
1. **Always check for existing tables/columns** before creating migrations
2. **Use simple queries first**, add complexity later
3. **Generate unique IDs with timestamps** to avoid conflicts
4. **Kill processes properly on Windows:** Use `taskkill //PID` with double slashes
5. **Check server logs immediately** when redirects fail

### ❌ Common Pitfalls
1. **Naming conflicts:** Never use same name for imports and exports
2. **Complex OR queries:** Supabase RLS doesn't handle them well without proper setup
3. **Hardcoded IDs:** Always generate unique identifiers
4. **Port assumptions:** Always check which port the server actually started on
5. **Missing tables:** Auth flows need profiles table with triggers

### 🔧 Debugging Checklist
When things break:
1. Check the server console for actual errors
2. Look for redirect loops in browser network tab
3. Verify database tables exist with correct columns
4. Ensure all imports/exports use correct names
5. Check which port the server is actually running on
6. Verify environment variables are loaded

---

## Next Development Phase

### 🎯 Current Focus: Agent Creation Wizard
Starting implementation of Phase 1 from the development plan:
- 4-step agent creation modal
- Source ingestion UI
- Basic RAG implementation
- Chat playground

### ✅ Agent Wizard Implementation (In Progress)
**Created Components:**
1. `components/agents/agent-wizard.tsx` - 4-step modal wizard
   - Step 1: Basic Info (name, description)
   - Step 2: AI Model Selection (GPT-3.5, GPT-4)
   - Step 3: Behavior Settings (prompt, welcome message)
   - Step 4: Review and Create

2. **UI Components Added:**
   - `components/ui/button.tsx` - Button component with variants
   - `components/ui/input.tsx` - Text input field
   - `components/ui/label.tsx` - Form labels
   - `components/ui/textarea.tsx` - Multi-line text input
   - `components/ui/select.tsx` - Dropdown selection
   - `components/ui/dialog.tsx` - Modal dialog container
   - `components/ui/progress.tsx` - Progress bar for wizard steps

3. **Database Migration 003:**
   - Added columns to agents table:
     - description, model, temperature, max_tokens
     - system_prompt, welcome_message, suggested_questions
     - created_by (user reference)
   - Added indexes for performance
   - Updated RLS policies for security

**Integration:**
- Updated `NewAgentButton` to open wizard instead of direct creation
- Wizard creates agent in draft mode
- Redirects to agent detail page after creation

This changelog will be updated with each significant change, error, or decision point.