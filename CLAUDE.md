# CLAUDE.md - Important Project Guidelines

## CRITICAL: Production-Ready Code Standards
**NO BAND-AID SOLUTIONS - This is a production SaaS application**

### Core Principles:
1. **Always implement proper, long-term solutions** - Never use temporary workarounds or placeholder implementations
2. **Research best practices** - Use WebSearch to find current best practices and modern libraries
3. **Choose production-ready libraries** - Select actively maintained, well-documented libraries
4. **Implement complete solutions** - Don't simplify or skip functionality for convenience
5. **Think scalability** - Every solution should work for 1 user or 10,000 users
6. **Security first** - Always consider security implications of implementations

### When faced with library issues:
- Research alternatives using WebSearch
- Choose modern, maintained libraries over outdated ones
- Implement proper error handling, not placeholders
- If a complex solution is needed (e.g., Python backend for PDF), propose it

## IMPORTANT: Persistent Issues Tracking
**Check PERSISTENT_ISSUES.md for recurring problems and their solutions**
- If encountering an issue multiple times, document it in PERSISTENT_ISSUES.md
- Always check PERSISTENT_ISSUES.md first when debugging known issues
- Update PERSISTENT_ISSUES.md when finding new solutions to recurring problems
- This is especially important after git resets or when reverting to earlier commits

## CRITICAL: Database Structure Requirements

### Project ID vs Workspace ID
**ALWAYS USE `project_id` - NEVER REVERT TO `workspace_id`**

The project has been refactored from using `workspace_id` to `project_id`. This is a deliberate architectural decision that must be maintained:

- ✅ ALWAYS use `project_id` in all database operations
- ❌ NEVER use `workspace_id` for new features
- ✅ The `agents` table has a `project_id` field that references projects
- ✅ The `sources` table should have a `project_id` field
- ✅ All new tables should use `project_id` for relationships

### Database Tables Structure
- `agents` table: Has `project_id` (NOT workspace_id)
- `sources` table: Has `project_id` (NOT workspace_id)
- All agent-related data uses `project_id` for relationships

## CRITICAL: MCP (Model Context Protocol) Priority

### USE MCP TOOLS WHEN THEY PROVIDE CLEAR VALUE
**These MCP servers provide direct API access and should be used for their specific strengths**

### Priority MCP Servers (Use These First):

#### 1. SUPABASE (mcp__supabase__*)
- ✅ USE: `mcp__supabase__apply_migration` - Apply database migrations directly
- ✅ USE: `mcp__supabase__execute_sql` - Run SQL queries
- ✅ USE: `mcp__supabase__get_logs` - Get service logs
- ✅ USE: `mcp__supabase__list_projects` - List Supabase projects
- ❌ AVOID: Supabase CLI (`npx supabase`), manual dashboard operations

#### 2. SHADCN UI (mcp__shadcn__*)
- ✅ USE: `mcp__shadcn__view_items_in_registries` - View component details
- ✅ USE: `mcp__shadcn__search_items_in_registries` - Search components
- ✅ USE: `mcp__shadcn__get_add_command_for_items` - Get installation commands
- ❌ AVOID: Manual component searches when MCP is available

#### 3. IDE (mcp__ide__*)
- ✅ USE: `mcp__ide__getDiagnostics` - Get language diagnostics
- ✅ USE: `mcp__ide__executeCode` - Execute code in notebooks
- ❌ AVOID: Manual error checking when MCP can provide diagnostics

#### 4. CONTEXT7 (mcp__context7__*)
- ✅ USE: `mcp__context7__get-library-docs` - Get up-to-date library documentation
- ✅ USE: `mcp__context7__resolve-library-id` - Find library IDs
- ❌ AVOID: Manual documentation searches, outdated docs

#### 5. PLAYWRIGHT (mcp__playwright__*)
- ✅ USE: For browser automation and testing
- ❌ AVOID: Manual browser testing approaches

### Use Regular Tools For:

#### Git Operations
- ✅ USE: Regular git commands for commits, pushes, pulls, branches
- These are simpler and more direct for everyday version control

#### MCP GitHub - Use ONLY When Needed:
- Creating GitHub issues/PRs programmatically via API
- Searching across multiple repositories
- Managing repository settings
- Bulk operations on GitHub resources

### PRACTICAL RULE:
Use MCP when it **simplifies** the task, not when it **complicates** it.
- Supabase operations → MCP is simpler (no CLI setup)
- Git commits → CLI is simpler (direct and familiar)

### Why This Approach:
1. **Practical focus** - Use the best tool for each job
2. **Reduced complexity** - Don't over-engineer simple tasks
3. **Proven patterns** - Based on actual usage in this project
4. **Clear guidelines** - Know when to use what

## Development Environment

### Port Configuration
**CRITICAL: ALWAYS USE PORT 3000 - NO EXCEPTIONS**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**
**ALWAYS USE PORT 3000**

- This project exclusively uses `localhost:3000` for development
- If port 3000 is in use, KILL the process using it (taskkill //PID {pid} //F on Windows)
- DO NOT use alternative ports (3001, 3002, 3003, etc.) - always fix and use port 3000
- The user will be annoyed if you use any port other than 3000

## Code Quality Standards

### Testing Commands
Always run these commands before marking any task as complete:
- `npm run lint` - Check for linting errors
- `npm run typecheck` - Check for TypeScript errors
- `npm test` - Run tests if available

### File Operations
- ALWAYS prefer editing existing files over creating new ones
- NEVER create documentation files unless explicitly requested
- Use appropriate tools (Grep, Glob, Task) instead of bash commands for searching

### State Management
- Always handle async operations properly
- Clear file preview URLs with `URL.revokeObjectURL()` to prevent memory leaks
- Use proper error handling and user feedback (toast notifications)

## Project-Specific Features

### Q&A Sources
- Questions are stored as JSON arrays in the database
- Images are stored in Supabase storage bucket: `agent-sources`
- Image URLs are stored in metadata.images field
- Cost-effective: Images uploaded once, URLs reused for each send

### Image Storage Structure
- Bucket: `agent-sources` (public)
- Path: `{agent_id}/qa/{timestamp}-{random}.{ext}`
- Stored in: `metadata.images` as array of URLs

### Content Architecture (IMPORTANT)
**All content MUST use the chunking system - NO LEGACY SUPPORT**
- Content is split into 2KB chunks and stored in `source_chunks` table
- The `content` column in `sources` table is deprecated and not used
- Files are stored in Supabase Storage, processed asynchronously, and chunked
- Each chunk has position, tokens count, and metadata for reconstruction
- Content retrieval uses `ChunkManager.reconstructContent()` exclusively

### Development Cleanup
- Use `/api/admin/cleanup` to remove old sources without chunks
- Actions: `identify` (list sources to delete) or `delete` (remove them)
- No migration needed - just re-upload files if needed
- Remember supabase project id owbwwkgiyvylmdvuiwsn