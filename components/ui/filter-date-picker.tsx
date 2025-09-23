'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  date: { from: Date; to: Date }
  setDate: (date: { from: Date; to: Date }) => void
  onClose?: () => void
}

export function DateRangePicker({ date, setDate, onClose }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date(2025, 7)) // August 2025
  const [selecting, setSelecting] = React.useState<'from' | 'to' | null>(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDateClick = (day: number, monthOffset: number = 0) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, day)

    if (!selecting || selecting === 'from') {
      setDate({ from: clickedDate, to: clickedDate })
      setSelecting('to')
    } else {
      if (clickedDate >= date.from) {
        setDate({ ...date, to: clickedDate })
      } else {
        setDate({ from: clickedDate, to: date.from })
      }
      setSelecting(null)
      if (onClose) {
        setTimeout(() => onClose(), 200)
      }
    }
  }

  const isInRange = (day: number, monthOffset: number = 0) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, day)
    return checkDate >= date.from && checkDate <= date.to
  }

  const isStartDate = (day: number, monthOffset: number = 0) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, day)
    return checkDate.toDateString() === date.from.toDateString()
  }

  const isEndDate = (day: number, monthOffset: number = 0) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, day)
    return checkDate.toDateString() === date.to.toDateString()
  }

  const renderCalendar = (monthOffset: number = 0) => {
    const displayMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset)
    const daysInMonth = getDaysInMonth(displayMonth)
    const firstDay = getFirstDayOfMonth(displayMonth)
    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const inRange = isInRange(day, monthOffset)
      const isStart = isStartDate(day, monthOffset)
      const isEnd = isEndDate(day, monthOffset)

      days.push(
        <div key={day} className="relative">
          {inRange && !isStart && !isEnd && (
            <div className="absolute inset-0 bg-blue-50" />
          )}
          {isStart && !isEnd && (
            <div className="absolute inset-0 bg-blue-50 rounded-l-full" />
          )}
          {isEnd && !isStart && (
            <div className="absolute inset-0 bg-blue-50 rounded-r-full" />
          )}
          <button
            onClick={() => handleDateClick(day, monthOffset)}
            className={cn(
              "relative h-10 w-10 rounded-full flex items-center justify-center text-sm transition-colors z-10",
              (isStart || isEnd) && "bg-gray-900 text-white hover:bg-gray-800",
              !inRange && !isStart && !isEnd && "hover:bg-gray-100"
            )}
          >
            {day}
          </button>
        </div>
      )
    }

    return (
      <div className="p-3">
        <div className="grid grid-cols-7 gap-0 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="h-10 w-10 flex items-center justify-center text-xs text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0">
          {days}
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <div className="border-r">
        <div className="flex items-center justify-between p-3 pb-1">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <div className="w-6" />
        </div>
        {renderCalendar(0)}
      </div>
      <div>
        <div className="flex items-center justify-between p-3 pb-1">
          <div className="w-6" />
          <span className="text-sm font-medium">
            {monthNames[(currentMonth.getMonth() + 1) % 12]} {currentMonth.getMonth() === 11 ? currentMonth.getFullYear() + 1 : currentMonth.getFullYear()}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {renderCalendar(1)}
      </div>
    </div>
  )
}