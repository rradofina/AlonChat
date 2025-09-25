import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlanService } from '@/lib/plans/plan-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const planService = new PlanService()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription with plan details
    const subscription = await planService.getUserSubscriptionWithPlan(user.id)

    if (!subscription?.plan) {
      // Return default starter plan if no subscription
      const starterPlan = await planService.getPlanByName('starter')
      return NextResponse.json({
        plan: starterPlan,
        subscription: null
      })
    }

    // Get subscription addons if any
    const addons = await planService.getSubscriptionAddons(subscription.id)

    return NextResponse.json({
      plan: subscription.plan,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at: subscription.cancel_at,
        canceled_at: subscription.canceled_at
      },
      addons
    })

  } catch (error) {
    console.error('Get user plan error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}