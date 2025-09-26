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

  /**
   * DEPRECATED: This method name is confusing - use getProjectSubscriptionWithPlan instead
   * Keeping for backward compatibility during migration
   * @deprecated Use getProjectSubscriptionWithPlan
   */
  async getUserSubscriptionWithPlan(userId: string): Promise<any> {
    // WARNING: This was incorrectly comparing userId to project_id
    // This would NEVER find matches since userId != projectId
    // Keeping this temporarily for backward compatibility
    // All callers should be updated to use proper methods below
    console.warn('DEPRECATED: getUserSubscriptionWithPlan called with userId - this is incorrect!')

    // Try to get user's default project and its subscription as a fallback
    const defaultProject = await this.getUserDefaultProject(userId)
    if (defaultProject) {
      return this.getProjectSubscriptionWithPlan(defaultProject.id)
    }

    return null
  }

  /**
   * Get subscription for a specific project
   * This is the CORRECT way to get subscriptions since they're tied to projects
   */
  async getProjectSubscriptionWithPlan(projectId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('project_id', projectId)
      .single()

    if (error) {
      // Not an error - project might not have a subscription yet
      if (error.code === 'PGRST116') {
        console.log(`No subscription found for project ${projectId}`)
      } else {
        console.error('Error fetching project subscription:', error)
      }
      return null
    }

    return data
  }

  /**
   * Get user's default project (first created project)
   * Used when we don't have explicit project context
   */
  async getUserDefaultProject(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching user default project:', error)
      return null
    }

    return data
  }

  /**
   * Get all projects for a user with their subscriptions
   * Useful for project switcher UI
   */
  async getUserProjectsWithSubscriptions(userId: string): Promise<any[]> {
    const { data: projects, error } = await this.supabase
      .from('projects')
      .select(`
        *,
        subscription:subscriptions(
          *,
          plan:plans(*)
        )
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching user projects with subscriptions:', error)
      return []
    }

    return projects || []
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