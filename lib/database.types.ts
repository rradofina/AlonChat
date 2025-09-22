export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          url_slug: string
          plan_tier: 'free' | 'starter' | 'pro' | 'enterprise'
          owner_id: string
          billing_email: string | null
          tax_type: string | null
          tax_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url_slug: string
          plan_tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          owner_id: string
          billing_email?: string | null
          tax_type?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url_slug?: string
          plan_tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          owner_id?: string
          billing_email?: string | null
          tax_type?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          locale: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          locale?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          locale?: string
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          avatar_url: string | null
          system_prompt: string | null
          temperature: number
          max_tokens: number
          model: string
          status: 'draft' | 'training' | 'ready' | 'error'
          last_trained_at: string | null
          config: Json
          created_by: string
          total_sources: number
          total_size_kb: number
          welcome_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          avatar_url?: string | null
          system_prompt?: string | null
          temperature?: number
          max_tokens?: number
          model?: string
          status?: 'draft' | 'training' | 'ready' | 'error'
          last_trained_at?: string | null
          config?: Json
          created_by?: string
          total_sources?: number
          total_size_kb?: number
          welcome_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          system_prompt?: string | null
          temperature?: number
          max_tokens?: number
          model?: string
          status?: 'draft' | 'training' | 'ready' | 'error'
          last_trained_at?: string | null
          config?: Json
          created_by?: string
          total_sources?: number
          total_size_kb?: number
          welcome_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          agent_id: string
          project_id: string
          type: 'website' | 'file' | 'text' | 'qa' | 'fb_export'
          name: string
          content: string | null
          website_url: string | null
          size_kb: number
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          project_id: string
          type: 'website' | 'file' | 'text' | 'qa' | 'fb_export'
          name: string
          content?: string | null
          website_url?: string | null
          size_kb?: number
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          project_id?: string
          type?: 'website' | 'file' | 'text' | 'qa' | 'fb_export'
          name?: string
          content?: string | null
          website_url?: string | null
          size_kb?: number
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      chunks: {
        Row: {
          id: string
          source_id: string
          agent_id: string
          content: string
          embedding: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_id: string
          agent_id: string
          content: string
          embedding?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          agent_id?: string
          content?: string
          embedding?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          agent_id: string
          project_id: string
          session_id: string
          channel: string
          location: Json | null
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          project_id: string
          session_id: string
          channel?: string
          location?: Json | null
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          project_id?: string
          session_id?: string
          channel?: string
          location?: Json | null
          started_at?: string
          ended_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          agent_id: string
          project_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          feedback: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          agent_id: string
          project_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          feedback?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          agent_id?: string
          project_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          feedback?: number | null
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          agent_id: string
          conversation_id: string | null
          name: string | null
          email: string | null
          phone: string | null
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          conversation_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          conversation_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          data?: Json
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          agent_id: string
          event_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          event_type: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          event_type?: string
          metadata?: Json
          created_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          project_id: string
          agent_id: string | null
          conversation_id: string | null
          type: string
          model: string
          action: string
          credits_used: number
          input_tokens: number
          output_tokens: number
          total_tokens: number
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          agent_id?: string | null
          conversation_id?: string | null
          type: string
          model: string
          action: string
          credits_used?: number
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          cost_usd?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          agent_id?: string | null
          conversation_id?: string | null
          type?: string
          model?: string
          action?: string
          credits_used?: number
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          cost_usd?: number
          created_at?: string
        }
      }
      billing_history: {
        Row: {
          id: string
          project_id: string
          invoice_number: string
          amount: number
          currency: string
          status: string
          payment_method: string | null
          description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          invoice_number: string
          amount: number
          currency?: string
          status?: string
          payment_method?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          invoice_number?: string
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          project_id: string
          type: string
          last4: string
          brand: string | null
          exp_month: number | null
          exp_year: number | null
          is_default: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: string
          last4: string
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          is_default?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: string
          last4?: string
          brand?: string | null
          exp_month?: number | null
          exp_year?: number | null
          is_default?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          project_id: string
          plan_tier: 'free' | 'starter' | 'pro' | 'enterprise'
          status: string
          credits_limit: number
          credits_used: number
          billing_email: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          plan_tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          status?: string
          credits_limit?: number
          credits_used?: number
          billing_email?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          plan_tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          status?: string
          credits_limit?: number
          credits_used?: number
          billing_email?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'owner' | 'admin' | 'member'
      plan_tier: 'free' | 'starter' | 'pro' | 'enterprise'
      agent_status: 'draft' | 'training' | 'ready' | 'error'
      source_type: 'website' | 'file' | 'text' | 'qa' | 'fb_export'
      message_role: 'user' | 'assistant' | 'system'
    }
  }
}