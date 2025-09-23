'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Star, Zap } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const plans = [
  {
    name: 'Hobby',
    price: 40,
    icon: Star,
    color: 'text-blue-600',
    popular: false,
    features: [
      'Everything in Free +',
      '12,000 message credits/month',
      '10 AI Actions per AI agent',
      '3 seats',
      '2 AI agents',
    ]
  },
  {
    name: 'Standard',
    price: 150,
    icon: Star,
    color: 'text-yellow-600',
    popular: true,
    features: [
      'Everything in Hobby +',
      '40,000 message credits/month',
      '15 AI Actions per AI agent',
      '5+ seats',
      '3 AI agents',
      'Advanced analytics',
    ]
  },
  {
    name: 'Pro',
    price: 500,
    icon: Zap,
    color: 'text-pink-600',
    popular: false,
    features: [
      'Everything in Standard +',
      'Unlimited message credits',
      'Unlimited AI Actions',
      'Unlimited seats',
      'Unlimited AI agents',
      'Priority support',
      'Custom integrations',
    ]
  }
]

const addOns = [
  {
    id: 'auto-recharge',
    name: 'Auto recharge credits',
    description: 'When your credits falls below a certain threshold, we\'ll automatically add credits that don\'t expire to your account, ensuring uninterrupted service.',
    price: '$14 per 1000 message credits',
    enabled: false,
  },
  {
    id: 'extra-agents',
    name: 'Extra agents',
    description: 'Add more AI agents beyond your plan limit.',
    price: '$7 per AI agent / month',
    enabled: false,
  },
  {
    id: 'custom-domains',
    name: 'Custom domains',
    description: 'Use your own custom domains for the AI agent\'s embed script, iframe, and shareable link.',
    price: '$59 / month',
    enabled: false,
  },
  {
    id: 'extra-credits',
    name: 'Extra message credits',
    description: 'Purchase additional message credits for your account.',
    price: '$12 per 1000 credits / month',
    enabled: false,
  },
  {
    id: 'remove-branding',
    name: 'Remove \'Powered By AlonChat\'',
    description: 'Remove the AlonChat branding from the iframe and widget.',
    price: '$39 / month',
    enabled: false,
  }
]

export default function PlansSettingsPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, boolean>>(
    addOns.reduce((acc, addon) => ({ ...acc, [addon.id]: addon.enabled }), {})
  )

  function handleUpgrade(planName: string) {
    toast.success(`Upgrade to ${planName} plan initiated`)
  }

  function handleAddOnToggle(addOnId: string) {
    setSelectedAddOns(prev => ({
      ...prev,
      [addOnId]: !prev[addOnId]
    }))
    const addon = addOns.find(a => a.id === addOnId)
    if (addon) {
      toast.success(
        selectedAddOns[addOnId]
          ? `${addon.name} disabled`
          : `${addon.name} enabled`
      )
    }
  }

  function handleContactSales() {
    toast.success('Sales team will contact you soon')
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Plans</h1>

      {/* Billing Period Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white border-2 rounded-lg p-6 relative ${
              plan.popular ? 'border-gray-900' : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gray-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <plan.icon className={`h-5 w-5 ${plan.color}`} />
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-gray-600 ml-1">per month</span>
            </div>

            <Button
              onClick={() => handleUpgrade(plan.name)}
              className={`w-full mb-6 ${
                plan.popular
                  ? 'bg-gray-900 hover:bg-gray-800 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Upgrade
            </Button>

            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Add-ons Section */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add-ons</h2>
        <div className="space-y-4">
          {addOns.map((addon) => (
            <div
              key={addon.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{addon.name}</h3>
                    <span className="text-sm font-medium text-gray-600">{addon.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 max-w-2xl">{addon.description}</p>
                </div>
                <Switch
                  checked={selectedAddOns[addon.id]}
                  onCheckedChange={() => handleAddOnToggle(addon.id)}
                  className="ml-4"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Section */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Enterprise</h3>
        </div>

        <p className="text-gray-600 mb-6">Let's talk</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Everything in Pro +</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">SSO</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">SLAs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">Priority support</span>
              </li>
            </ul>
          </div>
          <div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">Higher limits</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">Success manager (CSM)</span>
              </li>
            </ul>
          </div>
        </div>

        <Button
          onClick={handleContactSales}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          Contact us
        </Button>
      </div>
    </div>
  )
}