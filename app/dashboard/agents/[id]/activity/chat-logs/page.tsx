'use client'

import { useState } from 'react'
import { Filter, Download, RefreshCw, X, Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { DateRangePicker } from '@/components/ui/filter-date-picker'

interface ChatLog {
  id: string
  question: string
  timestamp: string
  timeAgo: string
  details?: string
}

export default function ChatLogsPage() {
  const [selectedChat, setSelectedChat] = useState<ChatLog | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [dateRangeOpen, setDateRangeOpen] = useState(false)
  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from: new Date(2025, 7, 24), // Aug 24, 2025
    to: new Date(2025, 8, 23), // Sep 23, 2025
  })
  const [confidenceScore, setConfidenceScore] = useState('Select score')
  const [source, setSource] = useState('Select source')
  const [feedback, setFeedback] = useState('Select feedback')

  // Mock data for chat logs
  const chatLogs: ChatLog[] = [
    {
      id: '1',
      question: 'Here are some Starbucks locations near Taft Avenue in Pasay City',
      timestamp: '11 hours ago',
      timeAgo: '11 hours ago',
      details: 'how about in taft'
    }
  ]

  // Mock data for the selected chat details
  const chatDetails = {
    question: 'Here are some Starbucks locations near Taft Avenue in Pasay City:',
    locations: [
      {
        number: 1,
        name: 'starbucks.ph',
        address: 'G/F, Main Mall, SM Mall of Asia, Bay Blvd., Bay City, Pasay City',
        orderType: 'Mobile Order & Pay'
      },
      {
        number: 2,
        name: 'SM Mall of Asia 2',
        address: 'G/F, Entertainment Bldg., Ocean Drive, Mall of Asia Complex, Pasay City',
        orderType: 'Mobile Order & Pay'
      },
      {
        number: 3,
        name: 'SM One E-Com Center',
        address: 'Harbour Drive, Mall of Asia Complex, Pasay City',
        orderType: 'Mobile Order & Pay'
      },
      {
        number: 4,
        name: 'S Maison Reserve',
        address: 'G/F, S Maison, Coral Way, Mall of Asia Complex, Pasay City',
        orderType: 'Reserve'
      }
    ],
    additionalInfo: 'These locations are within a reasonable distance from P. Ocampo Street. If you need more details or assistance, feel free to ask!',
    confidence: '0.539',
    confidenceLabel: '11 hours ago',
    actions: 'Revise answer'
  }

  const taftLocations = [
    {
      number: 1,
      name: 'Torre Lorenzo',
      address: 'G/F, Torre Lorenzo Bldg., Taft Ave. corner Vito Cruz St., Manila (near Pasay)',
      orderType: 'Mobile Order & Pay'
    },
    {
      number: 2,
      name: 'Torre Lorenzo Malate',
      address: 'GF Torre Lorenzo Malate, Gen Malvar St. Corner Vasquez St., Malate, Manila (near Pasay)',
      orderType: 'Mobile Order & Pay'
    },
    {
      number: 3,
      name: 'Cyberpark Tower 1',
      address: 'G/F Cyberpark Tower 1, G. McArthur corner Aguinaldo, Araneta Center, Quezon City (a bit further but accessible)',
      orderType: 'Mobile Order & Pay'
    }
  ]

  const confidenceScoreOptions = [
    '< 0.1', '< 0.2', '< 0.3', '< 0.4', '< 0.5',
    '< 0.6', '< 0.7', '< 0.8', '< 0.9', 'Show All'
  ]

  const sourceOptions = [
    'Show All', 'API', 'WhatsApp', 'Messenger', 'Instagram',
    'Slack', 'Chatbase site', 'Playground', 'Action preview',
    'Qna preview', 'Widget or Iframe', 'Iframe', 'Unspecified'
  ]

  const feedbackOptions = [
    'Contains thumbs down', 'Contains thumbs Up', 'Show All'
  ]

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Chat List Panel */}
      <div className="w-[500px] border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Chat logs</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterOpen(true)}
                className="h-8 w-8"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {chatLogs.map((chat) => (
            <div
              key={chat.id}
              className="mb-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedChat(chat)}
            >
              <div className="text-sm text-gray-900 mb-1">{chat.question}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{chat.details}</span>
                <span className="ml-auto">{chat.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Details Panel */}
      <div className="flex-1 bg-gray-50">
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Playground</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </Button>
          </div>
          <div className="flex gap-4 mt-4">
            <button className="pb-2 border-b-2 border-gray-900 font-medium">Chat</button>
            <button className="pb-2 text-gray-500">Details</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* User Question */}
          <div className="bg-gray-100 rounded-lg p-4 ml-auto max-w-2xl">
            <div className="text-sm text-gray-700">how about in taft</div>
          </div>

          {/* Bot Response */}
          <div className="bg-white rounded-lg p-6 shadow-sm max-w-4xl">
            <div className="mb-4">
              <div className="text-sm text-gray-900 mb-3">
                {chatDetails.question}
              </div>
            </div>

            {/* Locations List */}
            <ol className="space-y-4 mb-6">
              {chatDetails.locations.map((location) => (
                <li key={location.number} className="flex gap-3">
                  <span className="text-gray-500">{location.number}.</span>
                  <div>
                    <div className="font-medium text-gray-900">{location.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{location.address}</div>
                    <div className="text-sm text-gray-500 mt-1">{location.orderType}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="text-sm text-gray-700 mb-6">
              {chatDetails.additionalInfo}
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded">
                <span className="mr-1">🎯</span> {chatDetails.confidence}
              </span>
              <span className="text-gray-500">{chatDetails.confidenceLabel}</span>
              <button className="text-gray-500 hover:text-gray-700">
                {chatDetails.actions}
              </button>
            </div>
          </div>

          {/* Second User Question */}
          <div className="bg-gray-100 rounded-lg p-4 ml-auto max-w-2xl">
            <div className="text-sm text-gray-700">how about in taft</div>
          </div>

          {/* Second Bot Response */}
          <div className="bg-white rounded-lg p-6 shadow-sm max-w-4xl">
            <div className="mb-4">
              <div className="font-medium text-gray-900 mb-1">starbucks.ph</div>
              <div className="text-sm text-gray-900 mb-3">
                Here are some Starbucks locations near Taft Avenue in Pasay City:
              </div>
            </div>

            <ol className="space-y-4 mb-6">
              {taftLocations.map((location) => (
                <li key={location.number} className="flex gap-3">
                  <span className="text-gray-500">{location.number}.</span>
                  <div>
                    <div className="font-medium text-gray-900">{location.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{location.address}</div>
                    <div className="text-sm text-gray-500 mt-1">{location.orderType}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="text-sm text-gray-700 mb-6">
              These locations are close to Taft Avenue. If you need more information or specific directions, just let me know!
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded">
                <span className="mr-1">🎯</span> 0.512
              </span>
              <span className="text-gray-500">11 hours ago</span>
              <button className="text-gray-500 hover:text-gray-700">
                Revise answer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Filter by</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterOpen(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date Range */}
            <div>
              <label className="text-sm font-medium text-gray-700">Date range</label>
              <div className="mt-2">
                <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                    >
                      <span>
                        {date?.from ? (
                          date.to && date.from.toDateString() !== date.to.toDateString() ? (
                            <>
                              {format(date.from, "yyyy-MM-dd")} ~ {format(date.to, "yyyy-MM-dd")}
                            </>
                          ) : (
                            format(date.from, "yyyy-MM-dd")
                          )
                        ) : (
                          "Select date range"
                        )}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="text-sm font-medium text-gray-700 mb-2">Select date range</div>
                    </div>
                    <DateRangePicker
                      date={date}
                      setDate={setDate}
                      onClose={() => setDateRangeOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Confidence Score */}
            <div>
              <label className="text-sm font-medium text-gray-700">Confidence score</label>
              <Select value={confidenceScore} onValueChange={setConfidenceScore}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {confidenceScoreOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div>
              <label className="text-sm font-medium text-gray-700">Source</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'Show All' && (
                        <div className="flex items-center justify-between w-full">
                          <span>{option}</span>
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {option !== 'Show All' && option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Feedback */}
            <div>
              <label className="text-sm font-medium text-gray-700">Feedback</label>
              <Select value={feedback} onValueChange={setFeedback}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {feedbackOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'Show All' && (
                        <div className="flex items-center justify-between w-full">
                          <span>{option}</span>
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {option !== 'Show All' && option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setConfidenceScore('Select score')
                setSource('Select source')
                setFeedback('Select feedback')
                setDate({
                  from: new Date(2025, 7, 24),
                  to: new Date(2025, 8, 23)
                })
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Clear all
            </Button>
            <Button
              onClick={() => setFilterOpen(false)}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}