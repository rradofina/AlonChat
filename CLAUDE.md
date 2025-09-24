# CLAUDE.md - Important Project Guidelines

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