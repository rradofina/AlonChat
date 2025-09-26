# Current Architecture (January 2025)

## ⚠️ Important Note
This document reflects the CURRENT architecture. Historical documentation in this folder (Development-Progress.md, Chatbase-Analysis-Implementation.md) contains outdated references to "workspaces" - these are preserved for historical context but should NOT be used as reference.

## Current Terminology
- **Projects** - The main organizational unit (previously called workspaces)
- **Agents** - AI chatbots that belong to projects
- **Sources** - Data uploaded to train agents

## Database Structure

### Core Tables
```sql
projects
  - id (UUID)
  - name
  - owner_id (references auth.users)
  - plan_tier (legacy field, actual plan in subscriptions)
  - url_slug
  - created_at
  - updated_at

subscriptions (all billing data)
  - id
  - project_id (FK to projects)
  - plan_id (FK to plans)
  - status
  - credits_limit
  - credits_used
  - billing_email
  - stripe_customer_id
  - stripe_subscription_id
  - tax_type
  - tax_id
  - maya_customer_id
  - gcash_customer_id
  - billing_cycle
  - next_billing_date
  - current_period_start
  - current_period_end

agents
  - id
  - project_id (FK to projects)
  - name
  - created_by
  - status
  - (various AI configuration fields)

sources
  - id
  - agent_id (FK to agents)
  - project_id (FK to projects)
  - type (file, text, website, qa)
  - status
  - content (processed text)
  - metadata

source_chunks
  - id
  - source_id (FK to sources)
  - agent_id
  - content
  - embedding (vector)
  - position
  - tokens
```

## Key Relationships
1. **User → Projects** (one-to-many)
   - User owns multiple projects
   - Each project is independent

2. **Project → Subscription** (one-to-one)
   - Each project has exactly one subscription
   - All billing data in subscriptions table

3. **Project → Agents** (one-to-many)
   - Project can have multiple agents
   - Agent limits based on subscription plan

4. **Agent → Sources** (one-to-many)
   - Agent can have multiple data sources
   - Sources are processed and chunked for RAG

## Authentication & Authorization
- Supabase Auth for user management
- Row Level Security (RLS) policies ensure data isolation
- Users can only access their own projects/agents/data

## Billing Model
- **Project-based billing** - Each project has its own subscription
- Free plan created automatically on project creation
- Plans stored in `plans` table
- Usage tracked in `usage_logs` table

## API Structure
All API routes use project context:
- `/api/agents/[id]/*` - Agent operations
- `/api/user/plan` - Get user's default project subscription
- `/api/widget/[id]` - Public widget endpoint

## Frontend Routes
- `/dashboard` - Main dashboard (lists agents)
- `/dashboard/agents/[id]` - Agent detail/management
- `/dashboard/project/*` - Project settings/billing
- `/onboarding` - Creates project + subscription for new users

## Important Notes
1. **NO workspace references** - All code uses "project" terminology
2. **Subscriptions tied to projects** - Not users
3. **Billing consolidated** - All billing fields in subscriptions table only
4. **Foreign keys properly named** - All use `*_project_id_fkey` pattern

## Migration History
- Originally designed with "workspaces" terminology
- Refactored to "projects" for clarity (January 2025)
- Consolidated billing from projects table to subscriptions table
- Fixed foreign key constraint names

This architecture supports:
- Multiple projects per user
- Independent billing per project
- Team features (future - via project members)
- Scalable RAG chatbot deployment