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

## Development Environment

### Port Configuration
**IMPORTANT: ALWAYS USE PORT 3000**
- This project exclusively uses `localhost:3000` for development
- If there are issues on port 3000 and a reset is needed, resolve the port 3000 issue
- DO NOT use alternative ports - always fix and use port 3000

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