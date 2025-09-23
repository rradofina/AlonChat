'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { CreditCard, Plus, AlertCircle } from 'lucide-react'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expDate: string
}

interface Invoice {
  id: string
  number: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
}

export default function BillingSettingsPage() {
  const [organizationName, setOrganizationName] = useState('')
  const [country, setCountry] = useState('United States')
  const [addressLine1, setAddressLine1] = useState('')
  const [billingEmail, setBillingEmail] = useState('mond118@yahoo.com')
  const [taxType, setTaxType] = useState('None')
  const [taxId, setTaxId] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [saving, setSaving] = useState(false)

  async function handleSaveBillingDetails() {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Billing details saved')
    } catch (error) {
      toast.error('Failed to save billing details')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveBillingEmail() {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Billing email updated')
    } catch (error) {
      toast.error('Failed to update billing email')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTaxId() {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Tax information saved')
    } catch (error) {
      toast.error('Failed to save tax information')
    } finally {
      setSaving(false)
    }
  }

  function handleAddPaymentMethod() {
    toast.success('Redirecting to payment method setup...')
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Billing</h1>

      {/* Billing Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Billing details</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Enter organization name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="country">Country or region</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Philippines">Philippines</SelectItem>
                <SelectItem value="Singapore">Singapore</SelectItem>
                <SelectItem value="Japan">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="address">Address line 1</Label>
            <Input
              id="address"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Enter address"
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSaveBillingDetails}
            disabled={saving}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Billing Email */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Billing email</h2>
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Email used for invoices.
        </p>

        <div className="flex gap-3">
          <Input
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="flex-1"
            type="email"
          />
          <Button
            onClick={handleSaveBillingEmail}
            disabled={saving}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Tax ID */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Tax ID</h2>
        <p className="text-sm text-gray-500 mb-4">
          If you want your upcoming invoices to display a specific tax ID, please enter it here.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="tax-type">Tax type</Label>
            <Select value={taxType} onValueChange={setTaxType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="VAT">VAT</SelectItem>
                <SelectItem value="GST">GST</SelectItem>
                <SelectItem value="EIN">EIN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tax-id">ID</Label>
            <Input
              id="tax-id"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="N/A"
              className="mt-1"
              disabled={taxType === 'None'}
            />
          </div>

          <Button
            onClick={handleSaveTaxId}
            disabled={saving || taxType === 'None'}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Billing Method */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Billing method</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 font-medium">Brand</th>
                <th className="pb-3 font-medium">Number (Last 4)</th>
                <th className="pb-3 font-medium">Exp. Date</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No results.
                  </td>
                </tr>
              ) : (
                paymentMethods.map((method) => (
                  <tr key={method.id} className="border-b border-gray-100">
                    <td className="py-4 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      {method.brand}
                    </td>
                    <td className="py-4">•••• {method.last4}</td>
                    <td className="py-4">{method.expDate}</td>
                    <td className="py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-red-600">
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Button
          onClick={handleAddPaymentMethod}
          className="mt-4 bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Billing History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Billing history</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 font-medium">Invoice Number</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No results.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100">
                    <td className="py-4 text-sm">
                      <a href="#" className="text-blue-600 hover:text-blue-700">
                        {invoice.number}
                      </a>
                    </td>
                    <td className="py-4 text-sm text-gray-600">{invoice.date}</td>
                    <td className="py-4 text-sm text-gray-900">${invoice.amount}</td>
                    <td className="py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}