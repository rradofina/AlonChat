import { createServiceClient } from '@/lib/supabase/service'

export interface Plan {
  id: string
  name: string
  display_name: string
  description: string | null
  price_monthly: number | null
  price_yearly: number | null
  storage_limit_mb: number
  message_credits: number | null
  max_agents: number | null
  max_seats: number | null
  max_actions_per_agent: number | null
  features: any
  is_active: boolean
  is_custom: boolean
  sort_order: number
  badge_text: string | null
}

export interface PlanFeature {
  id: string
  plan_id: string
  feature_key: string
  feature_value: any
  enabled: boolean
}

export interface PlanAddon {
  id: string
  name: string
  display_name: string
  description: string | null
  price_monthly: number | null
  price_unit: string | null
  addon_type: string
  configuration: any
  is_active: boolean
}

export class PlanService {
  private supabase: any

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createServiceClient()
  }

  async getAllPlans(): Promise<Plan[]> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching plans:', error)
      return []
    }

    return data || []
  }

  async getPlanByName(name: string): Promise<Plan | null> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching plan:', error)
      return null
    }

    return data
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching plan by ID:', error)
      return null
    }

    return data
  }

  async getPlanFeatures(planId: string): Promise<PlanFeature[]> {
    const { data, error } = await this.supabase
      .from('plan_features')
      .select('*')
      .eq('plan_id', planId)
      .eq('enabled', true)

    if (error) {
      console.error('Error fetching plan features:', error)
      return []
    }

    return data || []
  }

  async getPlanWithFeatures(planName: string): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('get_plan_with_features', { plan_name: planName })
      .single()

    if (error) {
      console.error('Error fetching plan with features:', error)
      return null
    }

    return data
  }

  async getAvailableAddons(): Promise<PlanAddon[]> {
    const { data, error } = await this.supabase
      .from('plan_addons')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching addons:', error)
      return []
    }

    return data || []
  }

  async getUserSubscriptionWithPlan(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user subscription:', error)
      return null
    }

    return data
  }

  async getSubscriptionAddons(subscriptionId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('subscription_addons')
      .select(`
        *,
        addon:plan_addons(*)
      `)
      .eq('subscription_id', subscriptionId)

    if (error) {
      console.error('Error fetching subscription addons:', error)
      return []
    }

    return data || []
  }

  getStorageLimitBytes(plan: Plan): number {
    return (plan.storage_limit_mb || 100) * 1024 * 1024
  }

  getMessageCredits(plan: Plan): number | null {
    return plan.message_credits
  }

  getMaxAgents(plan: Plan): number | null {
    return plan.max_agents
  }

  getMaxSeats(plan: Plan): number | null {
    return plan.max_seats
  }

  getMaxActionsPerAgent(plan: Plan): number | null {
    return plan.max_actions_per_agent
  }

  isPlanFeatureEnabled(plan: Plan, featureKey: string): boolean {
    if (!plan.features) return false
    return !!plan.features[featureKey]
  }

  formatPlanPrice(plan: Plan, billing: 'monthly' | 'yearly' = 'monthly'): string {
    const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly

    if (price === null || price === undefined) {
      return 'Contact Sales'
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })

    return formatter.format(price)
  }

  calculateYearlySavings(plan: Plan): number {
    if (!plan.price_monthly || !plan.price_yearly) return 0

    const monthlyTotal = plan.price_monthly * 12
    const savings = monthlyTotal - plan.price_yearly

    return Math.round(savings)
  }

  getSavingsPercentage(plan: Plan): number {
    if (!plan.price_monthly || !plan.price_yearly) return 0

    const monthlyTotal = plan.price_monthly * 12
    const savings = monthlyTotal - plan.price_yearly
    const percentage = (savings / monthlyTotal) * 100

    return Math.round(percentage)
  }
}

// Don't create singleton - create instance in request handlers instead
// export const planService = new PlanService()