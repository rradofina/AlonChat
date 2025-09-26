'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CreditCard, Download, Info } from 'lucide-react'

interface BillingHistory {
  id: string
  invoice_number: string
  created_at: string
  amount: number
  status: string
}

export default function ProjectBillingPage() {
  const [billingEmail, setBillingEmail] = useState('')
  const [taxType, setTaxType] = useState('None')
  const [taxId, setTaxId] = useState('')
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get the current project
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (project) {
      // Get subscription for billing data
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('project_id', project.id)
        .single()

      if (subscription) {
        setBillingEmail(subscription.billing_email || user.email || '')
        setTaxId(subscription.tax_id || '')
        setTaxType(subscription.tax_type || 'None')
      } else {
        setBillingEmail(user.email || '')
      }

      // Load billing history
      const { data: history } = await supabase
        .from('billing_history')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (history) {
        setBillingHistory(history)
      }

      // Load payment methods
      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('project_id', project.id)

      if (methods) {
        setPaymentMethods(methods)
      }
    }
  }

  const handleUpdateBillingEmail = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get the current project
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!project) throw new Error('No project found')

      // Update subscription billing email
      const { error } = await supabase
        .from('subscriptions')
        .update({ billing_email: billingEmail })
        .eq('project_id', project.id)

      if (error) throw error
      toast.success('Billing email updated successfully')
    } catch (error) {
      toast.error('Failed to update billing email')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTaxInfo = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get the current project
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!project) throw new Error('No project found')

      // Update subscription tax info
      const { error } = await supabase
        .from('subscriptions')
        .update({
          tax_type: taxType,
          tax_id: taxId
        })
        .eq('project_id', project.id)

      if (error) throw error
      toast.success('Tax information updated successfully')
    } catch (error) {
      toast.error('Failed to update tax information')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = () => {
    // In production, redirect to Stripe/PayMongo payment method setup
    toast.info('Redirecting to payment setup...')
    setTimeout(() => {
      toast.success('Payment method integration coming soon!')
      setShowAddPayment(false)
    }, 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium">
          Save
        </button>
      </div>

      {/* Billing Email Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Billing email</h2>
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
          Email used for invoices. <Info className="h-4 w-4" />
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="billing@company.com"
          />
          <button
            onClick={handleUpdateBillingEmail}
            disabled={loading}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {/* Tax ID Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tax ID</h2>
        <p className="text-sm text-gray-500 mb-4">
          If you want your upcoming invoices to display a specific tax ID, please enter it here.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax type
            </label>
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="None">None</option>
              <option value="VAT">VAT</option>
              <option value="GST">GST</option>
              <option value="TIN">TIN (Philippines)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="N/A"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleUpdateTaxInfo}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Billing Method Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Billing method</h2>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No results.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Number (Last 4)
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exp. Date
                  </th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentMethods.map((method) => (
                  <tr key={method.id}>
                    <td className="py-4">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                    </td>
                    <td className="py-4 text-sm text-gray-900">
                      •••• {method.last4}
                    </td>
                    <td className="py-4 text-sm text-gray-500">
                      {method.exp_month}/{method.exp_year}
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-red-600 hover:text-red-800 text-sm">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowAddPayment(true)}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium"
          >
            Add
          </button>
        </div>
      </div>

      {/* Billing History Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Billing history</h2>

        {billingHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No results.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {billingHistory.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-4 text-sm text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="py-4 text-sm text-gray-500">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="py-4 text-sm text-gray-900">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Payment Method Modal */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add payment method</h3>
            <p className="text-gray-600 mb-4">
              You will be redirected to our payment provider to securely add your payment method.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddPayment(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPaymentMethod}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}