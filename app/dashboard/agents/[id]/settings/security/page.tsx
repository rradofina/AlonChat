'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export default function SecurityPage() {
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [allowSpecificDomains, setAllowSpecificDomains] = useState(false)
  const [domains, setDomains] = useState('example.com')
  const [messageLimit, setMessageLimit] = useState('20')
  const [timeLimit, setTimeLimit] = useState('240')
  const [limitMessage, setLimitMessage] = useState('Too many messages in a row')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Security</h1>

      {/* Visibility Section */}
      <div className="bg-white border border-gray-200 rounded-lg mb-8">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Visibility</h2>
          <p className="text-sm text-gray-600 mb-6">
            Embed it on your website so your website visitors are able to use it or keep it private.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Public Option */}
            <button
              onClick={() => setVisibility('public')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                visibility === 'public'
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${
                    visibility === 'public'
                      ? 'border-gray-900'
                      : 'border-gray-300'
                  }`}
                >
                  {visibility === 'public' && (
                    <div className="w-2 h-2 bg-gray-900 rounded-full" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 mb-1">Public</div>
                  <div className="text-sm text-gray-600">
                    Other people can chat with your agent if you send them the link
                  </div>
                </div>
              </div>
            </button>

            {/* Private Option */}
            <button
              onClick={() => setVisibility('private')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                visibility === 'private'
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${
                    visibility === 'private'
                      ? 'border-gray-900'
                      : 'border-gray-300'
                  }`}
                >
                  {visibility === 'private' && (
                    <div className="w-2 h-2 bg-gray-900 rounded-full" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 mb-1">Private</div>
                  <div className="text-sm text-gray-600">
                    No one can access your agent except you (your account)
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Specific Domains */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">
                Only allow embedding the agent on specific domains
              </label>
              <div className="relative">
                <Switch
                  checked={allowSpecificDomains && visibility === 'public'}
                  onCheckedChange={(checked) => {
                    if (visibility === 'public') {
                      setAllowSpecificDomains(checked)
                    }
                  }}
                  disabled={visibility === 'private'}
                />
                {visibility === 'private' && (
                  <div className="absolute inset-0 flex items-center justify-center cursor-not-allowed group">
                    <div className="invisible group-hover:visible absolute bottom-full mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                      Agent visibility must be public
                    </div>
                  </div>
                )}
              </div>
            </div>

            {visibility === 'public' && allowSpecificDomains && (
              <div className="mt-4">
                <Textarea
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  placeholder="example.com"
                  className="min-h-[100px] font-mono text-sm"
                />
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Info className="h-4 w-4" />
                  <span>Enter each domain in a new line</span>
                </div>
              </div>
            )}

            {visibility === 'private' && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Info className="h-4 w-4" />
                <span>Agent visibility must be public to enable this option</span>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white">
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Rate Limit Section */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Rate limit</h2>
          <p className="text-sm text-gray-600 mb-6">
            Limit the number of messages sent from one device on the iframe and chat bubble (this limit will not be applied to you on chatbase.co, only on your website for your users to prevent abuse).
          </p>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm">Limit to</span>
            <Input
              type="number"
              value={messageLimit}
              onChange={(e) => setMessageLimit(e.target.value)}
              className="w-24"
            />
            <span className="text-sm">messages every</span>
            <Input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-24"
            />
            <span className="text-sm">seconds.</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Message to show when limit is hit
              </label>
              <Textarea
                value={limitMessage}
                onChange={(e) => setLimitMessage(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setMessageLimit('20')
                setTimeLimit('240')
                setLimitMessage('Too many messages in a row')
              }}
            >
              Reset
            </Button>
            <Button className="bg-gray-900 hover:bg-gray-800 text-white">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}