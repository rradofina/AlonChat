'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Star, Sparkles, Zap } from 'lucide-react'

const plans = [
  {
    name: 'Hobby',
    icon: Star,
    iconColor: 'text-blue-500',
    price: 40,
    currency: '$',
    period: 'per month',
    popular: false,
    features: [
      'Everything in Free +',
      'Access to advanced models',
      '2,000 message credits/month',
      '1 AI agent',
      '5 AI Actions per AI agent',
      '33 MB per AI agent',
      'Unlimited links to train on',
      'API access',
      'Integrations',
      'Basic analytics'
    ]
  },
  {
    name: 'Standard',
    icon: Sparkles,
    iconColor: 'text-yellow-500',
    price: 150,
    currency: '$',
    period: 'per month',
    popular: true,
    features: [
      'Everything in Hobby +',
      '12,000 message credits/month',
      '10 AI Actions per AI agent',
      '3 seats',
      '2 AI agents'
    ]
  },
  {
    name: 'Pro',
    icon: Zap,
    iconColor: 'text-purple-500',
    price: 500,
    currency: '$',
    period: 'per month',
    popular: false,
    features: [
      'Everything in Standard +',
      '40,000 message credits/month',
      '15 AI Actions per AI agent',
      '5+ seats',
      '3 AI agents',
      'Advanced analytics'
    ]
  }
]

const enterpriseFeatures = [
  'Everything in Pro +',
  'SSO',
  'SLAs',
  'Priority support',
  'Higher limits',
  'Success manager (CSM)'
]

export default function ProjectPlansPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [currentPlan, setCurrentPlan] = useState('free')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCurrentPlan()
  }, [])

  const loadCurrentPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's project first
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!project) return

    // Get project's subscription with plan details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(name, tier)')
      .eq('project_id', project.id)
      .single()

    if (subscription && subscription.plan) {
      // Map plan tier to display name
      const planTier = subscription.plan.tier || 'free'
      setCurrentPlan(planTier)
    } else {
      // No subscription means free plan
      setCurrentPlan('free')
    }
  }

  const handleUpgrade = async (planName: string) => {
    setLoading(true)
    try {
      // In production, this would redirect to Stripe/PayMongo checkout
      toast.info(`Redirecting to checkout for ${planName} plan...`)

      // Simulate checkout redirect
      setTimeout(() => {
        toast.success('Checkout integration coming soon!')
        setLoading(false)
      }, 2000)
    } catch (error) {
      toast.error('Failed to start checkout')
      console.error(error)
      setLoading(false)
    }
  }

  const handleContactSales = () => {
    window.open('mailto:sales@alonchat.com?subject=Enterprise%20Plan%20Inquiry', '_blank')
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Plans</h1>

      {/* Billing Period Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const Icon = plan.icon
          const yearlyPrice = Math.floor(plan.price * 10) // 20% discount for yearly
          const displayPrice = billingPeriod === 'yearly' ? yearlyPrice : plan.price

          return (
            <div
              key={plan.name}
              className={`bg-white rounded-lg border ${
                plan.popular ? 'border-black shadow-lg' : 'border-gray-200'
              } p-6 relative`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium">
                    Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                </div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">{plan.currency}{displayPrice}</span>
                  <span className="text-gray-500 ml-2">
                    {billingPeriod === 'yearly' ? 'per year' : plan.period}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleUpgrade(plan.name)}
                disabled={loading}
                className={`w-full py-2 rounded-lg font-medium transition-colors mb-4 ${
                  plan.popular
                    ? 'bg-black text-white hover:bg-gray-900'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                Upgrade
              </button>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Enterprise Plan */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xl">🏢</span>
              </div>
              <h3 className="text-xl font-semibold">Enterprise</h3>
            </div>
            <p className="text-gray-600 mb-4">Let's talk</p>

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
              {enterpriseFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleContactSales}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 font-medium"
          >
            Contact us
          </button>
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Add-ons</h2>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold mb-2">Auto recharge credits</h3>
              <p className="text-gray-600">$14 per 1000 message credits</p>
              <p className="text-sm text-gray-500 mt-2">
                Automatically purchase additional message credits when you run low
              </p>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 font-medium">
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}