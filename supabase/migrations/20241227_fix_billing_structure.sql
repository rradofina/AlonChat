-- Migration to fix billing structure and consolidate billing columns in subscriptions table

-- Step 1: Add missing billing columns to subscriptions table if they don't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS maya_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS gcash_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50),
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP;

-- Step 2: Migrate existing billing data from projects to subscriptions
UPDATE subscriptions s
SET
  billing_email = COALESCE(s.billing_email, p.billing_email),
  stripe_customer_id = COALESCE(s.stripe_customer_id, p.stripe_customer_id),
  stripe_subscription_id = COALESCE(s.stripe_subscription_id, p.stripe_subscription_id),
  credits_limit = COALESCE(s.credits_limit, p.credits_limit),
  tax_type = COALESCE(s.tax_type, p.tax_type),
  tax_id = COALESCE(s.tax_id, p.tax_id),
  maya_customer_id = COALESCE(s.maya_customer_id, p.maya_customer_id),
  gcash_customer_id = COALESCE(s.gcash_customer_id, p.gcash_customer_id),
  billing_cycle = COALESCE(s.billing_cycle, p.billing_cycle),
  next_billing_date = COALESCE(s.next_billing_date, p.next_billing_date)
FROM projects p
WHERE s.project_id = p.id;

-- Step 3: Rename foreign key constraints from workspace_id to project_id
-- This fixes legacy constraint names that still referenced workspace_id
-- First, drop the old constraints
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_workspace_id_fkey;

ALTER TABLE usage
DROP CONSTRAINT IF EXISTS usage_workspace_id_fkey;

ALTER TABLE usage_logs
DROP CONSTRAINT IF EXISTS usage_logs_workspace_id_fkey;

ALTER TABLE billing_history
DROP CONSTRAINT IF EXISTS billing_history_workspace_id_fkey;

-- Recreate constraints with correct names
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Check if usage table has project_id column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='usage' AND column_name='project_id') THEN
        ALTER TABLE usage
        ADD CONSTRAINT usage_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check if usage_logs table has project_id column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='usage_logs' AND column_name='project_id') THEN
        ALTER TABLE usage_logs
        ADD CONSTRAINT usage_logs_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check if billing_history table has project_id column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='billing_history' AND column_name='project_id') THEN
        ALTER TABLE billing_history
        ADD CONSTRAINT billing_history_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Drop duplicate billing columns from projects table
-- IMPORTANT: Only uncomment and run this after confirming data is safely migrated
-- ALTER TABLE projects
-- DROP COLUMN IF EXISTS billing_email,
-- DROP COLUMN IF EXISTS stripe_customer_id,
-- DROP COLUMN IF EXISTS stripe_subscription_id,
-- DROP COLUMN IF EXISTS billing_cycle,
-- DROP COLUMN IF EXISTS next_billing_date,
-- DROP COLUMN IF EXISTS credits_remaining,
-- DROP COLUMN IF EXISTS credits_limit,
-- DROP COLUMN IF EXISTS maya_customer_id,
-- DROP COLUMN IF EXISTS gcash_customer_id,
-- DROP COLUMN IF EXISTS tax_type,
-- DROP COLUMN IF EXISTS tax_id;

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_project_id ON subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN subscriptions.billing_email IS 'Email address for billing notifications and invoices';
COMMENT ON COLUMN subscriptions.tax_type IS 'Type of tax ID (VAT, GST, TIN, etc.)';
COMMENT ON COLUMN subscriptions.tax_id IS 'Tax identification number';
COMMENT ON COLUMN subscriptions.maya_customer_id IS 'Customer ID for Maya payment gateway (Philippines)';
COMMENT ON COLUMN subscriptions.gcash_customer_id IS 'Customer ID for GCash payment gateway (Philippines)';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Billing cycle (monthly, yearly, etc.)';
COMMENT ON COLUMN subscriptions.next_billing_date IS 'Next billing date for the subscription';