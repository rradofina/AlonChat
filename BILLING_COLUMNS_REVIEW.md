# Billing Columns Review

## Current Issue: Duplicate Billing Columns

We have billing-related columns in both `projects` and `subscriptions` tables, which creates confusion about the source of truth.

## Current Structure:

### Projects Table Has:
```sql
- billing_email (character varying)
- stripe_customer_id (character varying)
- stripe_subscription_id (character varying)
- billing_cycle (character varying)
- next_billing_date (timestamp)
- credits_remaining (integer)
- credits_limit (integer)
- maya_customer_id (character varying)
- gcash_customer_id (character varying)
- tax_type (character varying)
- tax_id (character varying)
```

### Subscriptions Table Has:
```sql
- billing_email (text)
- stripe_customer_id (text)
- stripe_subscription_id (text)
- credits_limit (integer)
- credits_used (integer)
- current_period_start (timestamp with time zone)
- current_period_end (timestamp with time zone)
- status (text)
- plan_id (uuid)
```

## The Problem:

1. **Duplicate Fields** in both tables:
   - `billing_email`
   - `stripe_customer_id`
   - `stripe_subscription_id`
   - `credits_limit`

2. **Unclear Source of Truth**:
   - Which table should we check for billing info?
   - What if they get out of sync?

## Recommended Solution:

### Keep in Projects Table:
- `owner_id` - Who owns the project
- Basic project info (name, slug, created_at, etc.)

### Move to Subscriptions Table:
- ALL billing related fields
- All payment provider IDs (Stripe, Maya, GCash)
- All tax information
- All credits tracking

### Why This Makes Sense:
1. **Single Source of Truth**: All billing info in subscriptions table
2. **Cleaner Separation**: Projects = project metadata, Subscriptions = billing info
3. **Easier to Maintain**: Update billing in one place
4. **Supports Multiple Plans**: If a project changes plans, just update subscription

## Migration Strategy:

1. **Phase 1**: Copy all data from projects to subscriptions (if not already there)
2. **Phase 2**: Update all code to read from subscriptions table
3. **Phase 3**: Drop duplicate columns from projects table

## Code Impact:

Need to update:
- Any code reading billing info from projects table
- Admin panels that update billing
- API endpoints that check credits/limits

## IMPORTANT: Don't Do This Now

This requires careful migration to avoid data loss. Should be done when:
1. We have backups
2. We can test thoroughly
3. Ideally during low-traffic period

For now, the duplication is not breaking anything, just inefficient.