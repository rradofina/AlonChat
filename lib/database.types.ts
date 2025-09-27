export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          avatar_url: string | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          custom_user_prompt: string | null
          description: string | null
          id: string
          is_public: boolean | null
          last_trained_at: string | null
          max_tokens: number | null
          messenger_enabled: boolean | null
          messenger_page_id: string | null
          messenger_page_token: string | null
          messenger_webhook_secret: string | null
          model: string | null
          name: string
          project_id: string
          prompt_template_id: string | null
          status: Database["public"]["Enums"]["agent_status"] | null
          suggested_questions: Json | null
          system_prompt: string | null
          temperature: number | null
          total_size_kb: number | null
          total_sources: number | null
          updated_at: string | null
          welcome_message: string | null
          widget_settings: Json | null
        }
        Insert: {
          avatar_url?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_user_prompt?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_trained_at?: string | null
          max_tokens?: number | null
          messenger_enabled?: boolean | null
          messenger_page_id?: string | null
          messenger_page_token?: string | null
          messenger_webhook_secret?: string | null
          model?: string | null
          name: string
          project_id: string
          prompt_template_id?: string | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          suggested_questions?: Json | null
          system_prompt?: string | null
          temperature?: number | null
          total_size_kb?: number | null
          total_sources?: number | null
          updated_at?: string | null
          welcome_message?: string | null
          widget_settings?: Json | null
        }
        Update: {
          avatar_url?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_user_prompt?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_trained_at?: string | null
          max_tokens?: number | null
          messenger_enabled?: boolean | null
          messenger_page_id?: string | null
          messenger_page_token?: string | null
          messenger_webhook_secret?: string | null
          model?: string | null
          name?: string
          project_id?: string
          prompt_template_id?: string | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          suggested_questions?: Json | null
          system_prompt?: string | null
          temperature?: number | null
          total_size_kb?: number | null
          total_sources?: number | null
          updated_at?: string | null
          welcome_message?: string | null
          widget_settings?: Json | null
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          api_endpoint: string | null
          context_window: number | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          input_price_per_million: number | null
          is_active: boolean | null
          is_default: boolean | null
          is_fallback: boolean | null
          last_test_message: string | null
          last_test_status: string | null
          last_tested_at: string | null
          max_tokens: number | null
          message_credits: number | null
          model_id: string
          name: string
          output_price_per_million: number | null
          provider: string
          provider_id: string | null
          request_template: Json | null
          response_parser: string | null
          sort_order: number | null
          speed: string | null
          supports_functions: boolean | null
          supports_streaming: boolean | null
          supports_vision: boolean | null
          temperature?: number | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          context_window?: number | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          input_price_per_million?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_fallback?: boolean | null
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          max_tokens?: number | null
          message_credits?: number | null
          model_id: string
          name: string
          output_price_per_million?: number | null
          provider: string
          provider_id?: string | null
          request_template?: Json | null
          response_parser?: string | null
          sort_order?: number | null
          speed?: string | null
          supports_functions?: boolean | null
          supports_streaming?: boolean | null
          supports_vision?: boolean | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          context_window?: number | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          input_price_per_million?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_fallback?: boolean | null
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          max_tokens?: number | null
          message_credits?: number | null
          model_id?: string
          name?: string
          output_price_per_million?: number | null
          provider?: string
          provider_id?: string | null
          request_template?: Json | null
          response_parser?: string | null
          sort_order?: number | null
          speed?: string | null
          supports_functions?: boolean | null
          supports_streaming?: boolean | null
          supports_vision?: boolean | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          agent_id: string
          chunk_count: number | null
          content: string | null
          created_at: string | null
          embedding_cost_usd: number | null
          embedding_generated_at: string | null
          embedding_model: string | null
          error_message: string | null
          file_url: string | null
          id: string
          is_trained: boolean | null
          links: Json | null
          metadata: Json | null
          name: string
          processing_completed_at: string | null
          processing_started_at: string | null
          project_id: string
          size_kb: number | null
          status: string
          total_embedding_tokens: number | null
          type: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          agent_id: string
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          embedding_cost_usd?: number | null
          embedding_generated_at?: string | null
          embedding_model?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          is_trained?: boolean | null
          links?: Json | null
          metadata?: Json | null
          name: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id: string
          size_kb?: number | null
          status?: string
          total_embedding_tokens?: number | null
          type: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          agent_id?: string
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          embedding_cost_usd?: number | null
          embedding_generated_at?: string | null
          embedding_model?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          is_trained?: boolean | null
          links?: Json | null
          metadata?: Json | null
          name?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id?: string
          size_kb?: number | null
          status?: string
          total_embedding_tokens?: number | null
          type?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      source_chunks: {
        Row: {
          agent_id: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          position: number
          project_id: string
          source_id: string
          tokens: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          position: number
          project_id: string
          source_id: string
          tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          position?: number
          project_id?: string
          source_id?: string
          tokens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          updated_at: string | null
          url_slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          updated_at?: string | null
          url_slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          updated_at?: string | null
          url_slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          locale: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          locale?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          locale?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string
          channel: string | null
          ended_at: string | null
          id: string
          location: Json | null
          messenger_sender_id: string | null
          platform: string | null
          project_id: string | null
          session_id: string
          started_at: string | null
        }
        Insert: {
          agent_id: string
          channel?: string | null
          ended_at?: string | null
          id?: string
          location?: Json | null
          messenger_sender_id?: string | null
          platform?: string | null
          project_id?: string | null
          session_id: string
          started_at?: string | null
        }
        Update: {
          agent_id?: string
          channel?: string | null
          ended_at?: string | null
          id?: string
          location?: Json | null
          messenger_sender_id?: string | null
          platform?: string | null
          project_id?: string | null
          session_id?: string
          started_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          context_chunks: Json | null
          conversation_id: string
          created_at: string | null
          embedding_search_query: string | null
          feedback: number | null
          id: string
          metadata: Json | null
          platform: string | null
          project_id: string | null
          rag_enabled: boolean | null
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          content: string
          context_chunks?: Json | null
          conversation_id: string
          created_at?: string | null
          embedding_search_query?: string | null
          feedback?: number | null
          id?: string
          metadata?: Json | null
          platform?: string | null
          project_id?: string | null
          rag_enabled?: boolean | null
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          content?: string
          context_chunks?: Json | null
          conversation_id?: string
          created_at?: string | null
          embedding_search_query?: string | null
          feedback?: number | null
          id?: string
          metadata?: Json | null
          platform?: string | null
          project_id?: string | null
          rag_enabled?: boolean | null
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          metadata: Json | null
          name: string
          updated_at: string | null
          user_prompt: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
          user_prompt: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
          user_prompt?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          billing_email: string | null
          created_at: string | null
          credits_limit: number | null
          credits_used: number | null
          current_period_end: string | null
          current_period_start: string | null
          gcash_customer_id: string | null
          id: string
          maya_customer_id: string | null
          next_billing_date: string | null
          plan_id: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          project_id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tax_id: string | null
          tax_type: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string | null
          billing_email?: string | null
          created_at?: string | null
          credits_limit?: number | null
          credits_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          gcash_customer_id?: string | null
          id?: string
          maya_customer_id?: string | null
          next_billing_date?: string | null
          plan_id?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          project_id: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tax_id?: string | null
          tax_type?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string | null
          billing_email?: string | null
          created_at?: string | null
          credits_limit?: number | null
          credits_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          gcash_customer_id?: string | null
          id?: string
          maya_customer_id?: string | null
          next_billing_date?: string | null
          plan_id?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          project_id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tax_id?: string | null
          tax_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          action: string | null
          agent_id: string | null
          conversation_id: string | null
          cost_usd: number | null
          created_at: string | null
          credits_used: number | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string
          output_tokens: number | null
          project_id: string
          total_tokens: number | null
          type: string
        }
        Insert: {
          action?: string | null
          agent_id?: string | null
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model: string
          output_tokens?: number | null
          project_id: string
          total_tokens?: number | null
          type: string
        }
        Update: {
          action?: string | null
          agent_id?: string | null
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string
          output_tokens?: number | null
          project_id?: string
          total_tokens?: number | null
          type?: string
        }
        Relationships: []
      }
      api_providers: {
        Row: {
          api_base_url: string | null
          auth_header_name: string | null
          auth_header_prefix: string | null
          config_schema: Json | null
          created_at: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_builtin: boolean | null
          name: string
          npm_package: string | null
          pricing: Json | null
          provider_class: string
          required_env_vars: Json | null
          updated_at: string | null
        }
        Insert: {
          api_base_url?: string | null
          auth_header_name?: string | null
          auth_header_prefix?: string | null
          config_schema?: Json | null
          created_at?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_builtin?: boolean | null
          name: string
          npm_package?: string | null
          pricing?: Json | null
          provider_class: string
          required_env_vars?: Json | null
          updated_at?: string | null
        }
        Update: {
          api_base_url?: string | null
          auth_header_name?: string | null
          auth_header_prefix?: string | null
          config_schema?: Json | null
          created_at?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_builtin?: boolean | null
          name?: string
          npm_package?: string | null
          pricing?: Json | null
          provider_class?: string
          required_env_vars?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_providers: {
        Row: {
          api_base_url: string | null
          auth_header_name: string | null
          auth_header_prefix: string | null
          config_schema: Json | null
          created_at: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_builtin: boolean | null
          name: string
          npm_package: string | null
          pricing: Json | null
          provider_class: string
          required_env_vars: Json | null
          updated_at: string | null
        }
        Insert: {
          api_base_url?: string | null
          auth_header_name?: string | null
          auth_header_prefix?: string | null
          config_schema?: Json | null
          created_at?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_builtin?: boolean | null
          name: string
          npm_package?: string | null
          pricing?: Json | null
          provider_class: string
          required_env_vars?: Json | null
          updated_at?: string | null
        }
        Update: {
          api_base_url?: string | null
          auth_header_name?: string | null
          auth_header_prefix?: string | null
          config_schema?: Json | null
          created_at?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_builtin?: boolean | null
          name?: string
          npm_package?: string | null
          pricing?: Json | null
          provider_class?: string
          required_env_vars?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      agent_status: "draft" | "training" | "ready" | "error"
      message_role: "user" | "assistant" | "system"
      plan_tier: "free" | "starter" | "pro" | "enterprise"
      source_type: "website" | "file" | "text" | "qa" | "fb_export"
      user_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export interface AIModel {
  id: string
  name: string
  display_name: string
  model_id: string
  provider: string
  provider_id?: string | null
  description?: string | null
  is_active?: boolean | null
  is_default?: boolean | null
  is_fallback?: boolean | null
  context_window?: number | null
  max_tokens?: number | null
  input_price_per_million?: number | null
  output_price_per_million?: number | null
  message_credits?: number | null
  supports_functions?: boolean | null
  supports_streaming?: boolean | null
  supports_vision?: boolean | null
  speed?: string | null
  api_endpoint?: string | null
  request_template?: Json | null
  response_parser?: string | null
  last_tested_at?: string | null
  last_test_status?: string | null
  last_test_message?: string | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
  temperature?: number | null
}