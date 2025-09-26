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

    // FIXED: Get user's default project first
    // TODO: In the future, support project switching via query param or header
    const userProject = await planService.getUserDefaultProject(user.id)

    if (!userProject) {
      // User has no projects - shouldn't happen but handle gracefully
      return NextResponse.json({
        plan: await planService.getPlanByName('starter'),
        subscription: null,
        project: null
      })
    }

    // Get PROJECT's subscription with plan details (not user's!)
    const subscription = await planService.getProjectSubscriptionWithPlan(userProject.id)

    if (!subscription?.plan) {
      // Return default starter plan if no subscription
      const starterPlan = await planService.getPlanByName('starter')
      return NextResponse.json({
        plan: starterPlan,
        subscription: null,
        project: {
          id: userProject.id,
          name: userProject.name
        }
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
      project: {
        id: userProject.id,
        name: userProject.name
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