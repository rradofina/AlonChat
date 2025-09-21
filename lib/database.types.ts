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
      workspaces: {
        Row: {
          id: string
          name: string
          url_slug: string
          plan_tier: 'free' | 'starter' | 'pro' | 'enterprise'
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url_slug: string
          plan_tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url_slug?: string
          plan_tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
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
          workspace_id: string
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
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
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
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
          created_at?: string
          updated_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          agent_id: string
          type: 'website' | 'file' | 'text' | 'qa' | 'fb_export'
          name: string
          config: Json
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          type: 'website' | 'file' | 'text' | 'qa' | 'fb_export'
          name: string
          config?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          type?: 'website' | 'file' | 'text' | 'qa' | 'fb_export'
          name?: string
          config?: Json
          status?: string
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
          session_id: string
          channel: string
          location: Json | null
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          session_id: string
          channel?: string
          location?: Json | null
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
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
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          feedback: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          feedback?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
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
      usage: {
        Row: {
          id: string
          workspace_id: string
          agent_id: string | null
          credits_used: number
          tokens_used: number
          date: string
        }
        Insert: {
          id?: string
          workspace_id: string
          agent_id?: string | null
          credits_used?: number
          tokens_used?: number
          date?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          agent_id?: string | null
          credits_used?: number
          tokens_used?: number
          date?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
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