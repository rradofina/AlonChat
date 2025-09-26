# Migration Files - Historical Note

## Important Context

These migration files contain historical references to "workspaces" which have been replaced with "projects" in the current architecture.

### Why We're Not Updating Old Migrations

1. **Already Applied**: These migrations have already been run in the database
2. **Historical Accuracy**: They document the actual evolution of the database
3. **Database Integrity**: Changing old migrations could cause issues if someone needs to rebuild from scratch
4. **Audit Trail**: They serve as a historical record of how the database evolved

### Key Migrations with Workspace References

- `001_initial_schema.sql` - Original schema with workspaces table
- `003_agent_settings.sql` - Added workspace_id to agents
- `004_cleanup_duplicate_workspaces.sql` - Fixed workspace duplication issue
- `005_agent_sources.sql` - References workspace_id
- `006_ai_providers.sql` - References workspace context

### Transition Migrations

These migrations document the transition from workspaces to projects:
- `20250124_create_projects_table.sql` - Created new projects table
- `20250124_add_project_id_to_agents.sql` - Added project_id to agents
- `20250124_add_project_id_to_sources.sql` - Added project_id to sources

### Current State

The database has been fully migrated to use:
- `projects` table instead of `workspaces`
- `project_id` foreign keys instead of `workspace_id`
- All constraints renamed to use `project_id_fkey` pattern

### For New Development

- Always use `project_id` in new migrations
- Reference the `projects` table, not `workspaces`
- See `/docs/CURRENT_ARCHITECTURE.md` for the current schema

## Running Migrations

If setting up a new database from scratch:
1. Run migrations in order (they'll create workspaces first)
2. The transition migrations will create projects table
3. The final migrations consolidate everything under projects
4. The `20241227_fix_billing_structure.sql` migration completes the cleanup

This preserves the historical evolution while ensuring the final state is correct.