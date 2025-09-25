-- Create plans table for dynamic plan configuration
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- starter, standard, premium, custom
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),

  -- Resource limits
  storage_limit_mb INTEGER NOT NULL DEFAULT 100,
  message_credits INTEGER, -- NULL means unlimited
  max_agents INTEGER, -- NULL means unlimited
  max_seats INTEGER, -- NULL means unlimited
  max_actions_per_agent INTEGER, -- NULL means unlimited

  -- Features as JSONB for flexibility
  features JSONB DEFAULT '{}',

  -- Display and status
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  badge_text TEXT, -- e.g., "Most Popular", "Best Value"

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create plan features table for granular feature control
CREATE TABLE IF NOT EXISTS plan_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL, -- e.g., 'custom_domains', 'remove_branding', 'priority_support'
  feature_value JSONB DEFAULT 'true', -- Can be boolean, number, or complex object
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

  UNIQUE(plan_id, feature_key)
);

-- Create plan addons table for optional features
CREATE TABLE IF NOT EXISTS plan_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_unit TEXT, -- e.g., 'per agent', 'per 1000 credits'
  addon_type TEXT NOT NULL, -- 'credits', 'agents', 'domains', 'branding'
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Update subscriptions table to use plan_id instead of enum
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

-- Create subscription addons junction table
CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES plan_addons(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

  UNIQUE(subscription_id, addon_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_subscription_id ON subscription_addons(subscription_id);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans (public read, admin write)
CREATE POLICY "Plans are viewable by everyone"
ON plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Plans are editable by admins only"
ON plans FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM profiles WHERE role = 'admin'
));

-- RLS policies for plan_features (public read, admin write)
CREATE POLICY "Plan features are viewable by everyone"
ON plan_features FOR SELECT
USING (enabled = true);

CREATE POLICY "Plan features are editable by admins only"
ON plan_features FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM profiles WHERE role = 'admin'
));

-- RLS policies for plan_addons (public read, admin write)
CREATE POLICY "Plan addons are viewable by everyone"
ON plan_addons FOR SELECT
USING (is_active = true);

CREATE POLICY "Plan addons are editable by admins only"
ON plan_addons FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM profiles WHERE role = 'admin'
));

-- RLS policies for subscription_addons (users can view their own)
CREATE POLICY "Users can view their own subscription addons"
ON subscription_addons FOR SELECT
USING (subscription_id IN (
  SELECT id FROM subscriptions WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage their own subscription addons"
ON subscription_addons FOR ALL
USING (subscription_id IN (
  SELECT id FROM subscriptions WHERE user_id = auth.uid()
));

-- Insert initial plans (no free tier as requested)
INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, storage_limit_mb, message_credits, max_agents, max_seats, max_actions_per_agent, features, sort_order, is_active)
VALUES
  ('starter', 'Starter', 'Perfect for small businesses getting started', 29.00, 290.00, 100, 5000, 2, 3, 10,
   '{"analytics": "basic", "support": "email", "custom_branding": false, "api_access": false}', 1, true),

  ('standard', 'Standard', 'Great for growing teams', 79.00, 790.00, 500, 20000, 5, 10, 20,
   '{"analytics": "advanced", "support": "priority", "custom_branding": true, "api_access": true, "integrations": ["slack", "teams", "zapier"]}', 2, true),

  ('premium', 'Premium', 'For larger organizations with advanced needs', 199.00, 1990.00, 2048, NULL, NULL, NULL, NULL,
   '{"analytics": "premium", "support": "dedicated", "custom_branding": true, "api_access": true, "integrations": "all", "sla": true, "training": true}', 3, true),

  ('custom', 'Custom', 'Tailored solutions for enterprise needs', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '{"contact_sales": true}', 4, true)
ON CONFLICT (name) DO NOTHING;

-- Mark Standard as most popular
UPDATE plans SET badge_text = 'Most Popular' WHERE name = 'standard';

-- Insert plan features
INSERT INTO plan_features (plan_id, feature_key, feature_value, enabled)
SELECT
  p.id,
  f.feature_key,
  f.feature_value,
  true
FROM plans p
CROSS JOIN (
  VALUES
    ('starter'::TEXT, 'email_support'::TEXT, 'true'::JSONB),
    ('starter', 'basic_analytics', 'true'),
    ('standard', 'priority_support', 'true'),
    ('standard', 'advanced_analytics', 'true'),
    ('standard', 'custom_branding', 'true'),
    ('standard', 'api_access', 'true'),
    ('premium', 'dedicated_support', 'true'),
    ('premium', 'premium_analytics', 'true'),
    ('premium', 'custom_branding', 'true'),
    ('premium', 'api_access', 'true'),
    ('premium', 'white_label', 'true'),
    ('premium', 'sso', 'true')
) AS f(plan_name, feature_key, feature_value)
WHERE p.name = f.plan_name
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Insert available addons
INSERT INTO plan_addons (name, display_name, description, price_monthly, price_unit, addon_type, is_active)
VALUES
  ('extra_credits', 'Extra Message Credits', 'Add more message credits to your monthly allowance', 12.00, 'per 1000 credits', 'credits', true),
  ('auto_recharge', 'Auto Recharge Credits', 'Automatically add credits when running low', 14.00, 'per 1000 credits', 'credits', true),
  ('extra_agents', 'Additional AI Agents', 'Add more AI agents beyond your plan limit', 15.00, 'per agent', 'agents', true),
  ('extra_seats', 'Additional Seats', 'Add more team members', 10.00, 'per seat', 'seats', true),
  ('custom_domains', 'Custom Domains', 'Use your own domains for agents', 59.00, 'per month', 'domains', true),
  ('remove_branding', 'Remove Branding', 'Remove "Powered by AlonChat" branding', 39.00, 'per month', 'branding', true)
ON CONFLICT (name) DO NOTHING;

-- Function to get plan details with features
CREATE OR REPLACE FUNCTION get_plan_with_features(plan_name TEXT)
RETURNS TABLE (
  plan_id UUID,
  name TEXT,
  display_name TEXT,
  description TEXT,
  price_monthly DECIMAL,
  price_yearly DECIMAL,
  storage_limit_mb INTEGER,
  message_credits INTEGER,
  max_agents INTEGER,
  max_seats INTEGER,
  features JSONB,
  plan_features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.display_name,
    p.description,
    p.price_monthly,
    p.price_yearly,
    p.storage_limit_mb,
    p.message_credits,
    p.max_agents,
    p.max_seats,
    p.features,
    COALESCE(
      jsonb_object_agg(pf.feature_key, pf.feature_value)
      FILTER (WHERE pf.feature_key IS NOT NULL),
      '{}'::jsonb
    ) as plan_features
  FROM plans p
  LEFT JOIN plan_features pf ON p.id = pf.plan_id AND pf.enabled = true
  WHERE p.name = plan_name AND p.is_active = true
  GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_addons_updated_at BEFORE UPDATE ON plan_addons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration: Convert existing plan_tier enum to plan_id
-- This will be run once to migrate existing data
DO $$
DECLARE
  starter_plan_id UUID;
  standard_plan_id UUID;
  premium_plan_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO starter_plan_id FROM plans WHERE name = 'starter';
  SELECT id INTO standard_plan_id FROM plans WHERE name = 'standard';
  SELECT id INTO premium_plan_id FROM plans WHERE name = 'premium';

  -- Update existing subscriptions
  UPDATE subscriptions SET plan_id = starter_plan_id WHERE plan_tier = 'starter';
  UPDATE subscriptions SET plan_id = standard_plan_id WHERE plan_tier = 'pro';
  UPDATE subscriptions SET plan_id = premium_plan_id WHERE plan_tier = 'enterprise';

  -- Set default for free tier users to starter (since no more free tier)
  UPDATE subscriptions SET plan_id = starter_plan_id WHERE plan_tier = 'free' OR plan_id IS NULL;
END $$;

-- After migration is complete and verified, you can drop the old column with:
-- ALTER TABLE subscriptions DROP COLUMN plan_tier;
-- DROP TYPE IF EXISTS plan_tier;