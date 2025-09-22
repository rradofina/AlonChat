-- Create AI Models table
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL, -- openai, google, anthropic, etc.
  model_id VARCHAR(255) NOT NULL, -- actual model identifier for API calls
  description TEXT,
  context_window INTEGER,
  max_tokens INTEGER,
  cost_per_1k_input DECIMAL(10, 6),
  cost_per_1k_output DECIMAL(10, 6),
  supports_vision BOOLEAN DEFAULT false,
  supports_function_calling BOOLEAN DEFAULT false,
  supports_streaming BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_deprecated BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  capabilities JSONB, -- store additional capabilities as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Prompt Presets table
CREATE TABLE IF NOT EXISTS prompt_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- customer_support, sales, education, etc.
  description TEXT,
  prompt_template TEXT NOT NULL,
  variables JSONB, -- store variables that can be replaced in template
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  is_public BOOLEAN DEFAULT false, -- whether this preset is available to all users
  sort_order INTEGER DEFAULT 0,
  tags TEXT[], -- array of tags for categorization
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI Actions table for future extensibility
CREATE TABLE IF NOT EXISTS ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  action_type VARCHAR(100) NOT NULL, -- api_call, webhook, function, etc.
  configuration JSONB NOT NULL, -- store action configuration
  required_permissions TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Agent Model Configurations table (which models an agent can use)
CREATE TABLE IF NOT EXISTS agent_model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  temperature DECIMAL(2, 1) DEFAULT 0.7,
  max_tokens INTEGER,
  top_p DECIMAL(2, 1),
  frequency_penalty DECIMAL(2, 1),
  presence_penalty DECIMAL(2, 1),
  custom_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, model_id)
);

-- Create Agent Prompt Presets table (which presets an agent uses)
CREATE TABLE IF NOT EXISTS agent_prompt_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES prompt_presets(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  custom_variables JSONB, -- agent-specific variable values
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, preset_id)
);

-- Create System Settings table for global configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) NOT NULL, -- string, number, boolean, json, array
  category VARCHAR(100),
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- whether this setting is exposed to frontend
  is_editable BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_ai_models_provider ON ai_models(provider);
CREATE INDEX idx_ai_models_active ON ai_models(is_active);
CREATE INDEX idx_prompt_presets_category ON prompt_presets(category);
CREATE INDEX idx_prompt_presets_org ON prompt_presets(organization_id);
CREATE INDEX idx_agent_model_configs_agent ON agent_model_configs(agent_id);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_presets_updated_at BEFORE UPDATE ON prompt_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_actions_updated_at BEFORE UPDATE ON ai_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_model_configs_updated_at BEFORE UPDATE ON agent_model_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default AI models
INSERT INTO ai_models (name, display_name, provider, model_id, description, context_window, max_tokens, sort_order) VALUES
-- OpenAI Models
('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'gpt-4o-mini', 'Affordable and intelligent small model for fast, lightweight tasks', 128000, 16384, 1),
('gpt-4o', 'GPT-4o', 'openai', 'gpt-4o', 'High-intelligence flagship model for complex, multi-step tasks', 128000, 4096, 2),
('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 'gpt-4-turbo-preview', 'Previous generation high-intelligence model', 128000, 4096, 3),
('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'gpt-3.5-turbo', 'Fast, inexpensive model for simple tasks', 16385, 4096, 4),

-- Google Models
('gemini-2.0-flash', 'Gemini 2.0 Flash', 'google', 'gemini-2.0-flash-exp', 'Fast and versatile model from Google', 1048576, 8192, 5),
('gemini-1.5-pro', 'Gemini 1.5 Pro', 'google', 'gemini-1.5-pro', 'Advanced reasoning and multi-modal capabilities', 2097152, 8192, 6),
('gemini-1.5-flash', 'Gemini 1.5 Flash', 'google', 'gemini-1.5-flash', 'Fast and efficient for high-volume tasks', 1048576, 8192, 7),

-- Anthropic Models
('claude-3-opus', 'Claude 3 Opus', 'anthropic', 'claude-3-opus-20240229', 'Most powerful model for highly complex tasks', 200000, 4096, 8),
('claude-3-sonnet', 'Claude 3 Sonnet', 'anthropic', 'claude-3-sonnet-20240229', 'Balanced performance for most tasks', 200000, 4096, 9),
('claude-3-haiku', 'Claude 3 Haiku', 'anthropic', 'claude-3-haiku-20240307', 'Fastest and most compact model', 200000, 4096, 10);

-- Insert default prompt presets
INSERT INTO prompt_presets (name, category, description, prompt_template, is_public, sort_order) VALUES
('AI Assistant', 'general', 'General-purpose AI assistant',
'### Role
You are an AI assistant who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note.',
true, 1),

('Customer Support Agent', 'customer_support', 'Professional customer service representative',
'You are a customer support agent. Your primary goals are:
- Provide friendly, professional, and efficient support
- Resolve customer issues quickly and effectively
- Maintain a positive and empathetic tone
- Escalate complex issues when necessary
- Document interactions accurately
Always prioritize customer satisfaction while following company policies.',
true, 2),

('Sales Agent', 'sales', 'Knowledgeable sales representative',
'You are a sales agent for our company. Your responsibilities include:
- Understanding customer needs and pain points
- Presenting our products/services effectively
- Answering questions about features and pricing
- Handling objections professionally
- Guiding customers through the purchase process
- Building trust and long-term relationships
Focus on providing value and solving customer problems.',
true, 3),

('Technical Support', 'customer_support', 'IT and technical assistance specialist',
'You are a technical support specialist. Your expertise includes:
- Diagnosing technical issues systematically
- Providing clear step-by-step solutions
- Explaining technical concepts in simple terms
- Troubleshooting software and hardware problems
- Recommending preventive measures
Be patient and thorough in your explanations.',
true, 4),

('Content Writer', 'content', 'Professional content creator',
'You are a professional content writer. Your skills include:
- Creating engaging and informative content
- Adapting tone and style to the target audience
- SEO optimization and keyword integration
- Fact-checking and research
- Proofreading and editing
Deliver high-quality, original content that meets the specified requirements.',
true, 5),

('Language Tutor', 'education', 'Patient and encouraging language teacher',
'You are a language tutor specializing in conversational practice. Your approach includes:
- Correcting mistakes gently and constructively
- Explaining grammar rules clearly
- Providing practical examples
- Encouraging regular practice
- Adapting to the student''s level
- Cultural context and idioms
Help students build confidence in their language skills.',
true, 6),

('Code Assistant', 'development', 'Programming and development helper',
'You are a coding assistant. Your capabilities include:
- Writing clean, efficient code
- Debugging and troubleshooting
- Explaining programming concepts
- Code reviews and optimization
- Best practices and design patterns
- Documentation and comments
Provide practical solutions with clear explanations.',
true, 7),

('Life Coach', 'personal', 'Motivational and goal-oriented advisor',
'You are a life coach focused on personal development. Your approach involves:
- Active listening and empathy
- Goal setting and action planning
- Motivation and accountability
- Overcoming obstacles and limiting beliefs
- Work-life balance strategies
- Personal growth techniques
Empower individuals to achieve their full potential.',
true, 8);

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('default_model', '"gpt-4o-mini"', 'string', 'ai', 'Default AI model for new agents', true),
('max_conversation_length', '100', 'number', 'limits', 'Maximum number of messages per conversation', true),
('enable_model_comparison', 'true', 'boolean', 'features', 'Enable model comparison feature', true),
('supported_file_types', '["pdf", "txt", "docx", "csv", "json"]', 'array', 'uploads', 'Supported file types for document upload', true),
('max_file_size_mb', '10', 'number', 'uploads', 'Maximum file size in MB', true),
('rate_limit_per_minute', '60', 'number', 'limits', 'API rate limit per minute', false),
('maintenance_mode', 'false', 'boolean', 'system', 'System maintenance mode', false);

-- Add RLS policies for security
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_prompt_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read active models
CREATE POLICY "Anyone can view active AI models" ON ai_models
  FOR SELECT USING (is_active = true);

-- Public presets are readable by all, private ones by organization members
CREATE POLICY "View public or own organization presets" ON prompt_presets
  FOR SELECT USING (
    is_public = true OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Agent configurations are viewable by agent owners
CREATE POLICY "View own agent model configs" ON agent_model_configs
  FOR SELECT USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Public settings are readable by all
CREATE POLICY "View public system settings" ON system_settings
  FOR SELECT USING (is_public = true);