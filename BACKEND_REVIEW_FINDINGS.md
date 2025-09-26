# Backend Review Findings

## Summary
Comprehensive review completed of the AlonChat backend to ensure project-based subscription model is correctly implemented throughout the codebase.

## ✅ COMPLETED SUCCESSFULLY

### 1. Database Structure
- All tables correctly use `project_id` instead of `workspace_id`
- Foreign key relationships are properly set up
- **Minor Issue**: Foreign key constraint names still use old terminology (e.g., `subscriptions_workspace_id_fkey`) but functionally correct

### 2. API Routes
All API routes checked and confirmed to properly use project-based logic:
- `/api/agents/create` - Correctly creates agents under project
- `/api/agents/[id]/chat` - Uses project_id for billing and tracking
- `/api/agents/[id]/sources/files` - Associates sources with project_id
- `/api/webhooks/messenger` - Correctly handles project context
- `/api/widget/[id]` - Public endpoint works correctly

### 3. Authentication Flow
- Signup → Auth Callback → Dashboard → Onboarding (if no project) → Project Created
- Onboarding page correctly creates projects (fixed from workspaces)
- Project context properly maintained throughout

### 4. Terminology
- All "workspace" references removed from UI
- Consistently using "project" terminology throughout
- Dashboard header properly displays project name and plan

## ⚠️ ISSUES FOUND THAT NEED FIXING

### 1. Plan Display Issue
**Location**: `app/dashboard/project/plans/page.tsx` (line 91-98)
**Problem**: Getting plan from `projects.plan_tier` instead of subscription
```typescript
// CURRENT (INCORRECT):
const { data: projects } = await supabase
  .from('projects')
  .select('plan_tier')
  .eq('owner_id', user.id)

// SHOULD BE:
const { data: project } = await supabase
  .from('projects')
  .select('id')
  .eq('owner_id', user.id)
  .single()

const { data: subscription } = await supabase
  .from('subscriptions')
  .select('*, plan:plans(*)')
  .eq('project_id', project.id)
  .single()
```

### 2. Billing Page Issues
**Location**: `app/dashboard/project/billing/page.tsx`
**Problems**:
- Updates billing info on projects table (lines 75-79, 97-104)
- Should update subscriptions table instead
- Duplicate billing columns between projects and subscriptions tables

### 3. Foreign Key Constraint Names (Low Priority)
**Database**: Supabase
**Issue**: Constraints still named with old terminology:
- `subscriptions_workspace_id_fkey` (should be `subscriptions_project_id_fkey`)
- `usage_workspace_id_fkey` (should be `usage_project_id_fkey`)
- Functionally correct but confusing for maintenance

## 📋 PENDING CLEANUP (Documented for Future)

### 1. Duplicate Billing Columns
As documented in `BILLING_COLUMNS_REVIEW.md`:
- Both projects and subscriptions tables have billing columns
- Need migration to consolidate in subscriptions table
- Not urgent as functionality works

### 2. Missing Subscription Creation Flow
- No code to actually create subscriptions when projects are created
- Projects get created in onboarding but no corresponding subscription
- Need to add subscription creation with free plan

## ✅ WHAT'S WORKING WELL

1. **Project-Based Architecture**: Core architecture correctly implements project-based subscriptions
2. **API Consistency**: All API routes properly use project_id for operations
3. **Agent Management**: Agents correctly associated with projects
4. **Source Management**: Files and sources properly linked to projects
5. **Usage Tracking**: Usage logs correctly track by project_id
6. **Authentication**: User → Project → Agent hierarchy properly maintained

## 🔧 RECOMMENDED IMMEDIATE FIXES

1. **Fix Plans Page** - Update to read from subscriptions table
2. **Fix Billing Page** - Update to write to subscriptions table
3. **Add Subscription Creation** - Create free subscription when project is created in onboarding

## 📝 NOTES

The refactoring from workspace_id to project_id was successful. The system is functionally correct but has some UI pages still reading/writing to wrong tables for billing/subscription data.

## Next Steps
1. Fix the plans page to read from subscriptions
2. Fix the billing page to update subscriptions
3. Add subscription creation in onboarding flow
4. Consider renaming foreign key constraints (low priority)