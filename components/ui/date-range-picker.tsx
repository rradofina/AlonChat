'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps {
  className?: string
  onDateChange?: (startDate: Date, endDate: Date) => void
}

export function DateRangePicker({ className, onDateChange }: DateRangePickerProps) {
  const [date, setDate] = React.useState<{ from: Date; to: Date }>({
    from: new Date(2025, 8, 1), // Sep 1, 2025
    to: new Date(2025, 8, 23), // Sep 23, 2025
  })
  const [currentMonth, setCurrentMonth] = React.useState(new Date(2025, 8))
  const [isOpen, setIsOpen] = React.useState(false)
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

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)

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
      if (onDateChange) {
        onDateChange(date.from, clickedDate)
      }
    }
  }

  const isInRange = (day: number) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate >= date.from && checkDate <= date.to
  }

  const isStartDate = (day: number) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate.toDateString() === date.from.toDateString()
  }

  const isEndDate = (day: number) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
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
      const checkDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day)
      const inRange = checkDate >= date.from && checkDate <= date.to
      const isStart = checkDate.toDateString() === date.from.toDateString()
      const isEnd = checkDate.toDateString() === date.to.toDateString()
      const isToday = checkDate.toDateString() === new Date().toDateString()

      // Determine if this day is at the start or end of a week for range styling
      const dayOfWeek = checkDate.getDay()
      const isRangeStart = isStart || (inRange && dayOfWeek === 0)
      const isRangeEnd = isEnd || (inRange && dayOfWeek === 6)

      days.push(
        <div key={day} className="relative h-10 w-10">
          {inRange && !isStart && !isEnd && (
            <div
              className={cn(
                "absolute inset-0 bg-blue-50",
                isRangeStart && "rounded-l-full",
                isRangeEnd && "rounded-r-full"
              )}
            />
          )}
          {isStart && !isEnd && (
            <div className="absolute inset-0 bg-blue-50 rounded-l-full" />
          )}
          {isEnd && !isStart && (
            <div className="absolute inset-0 bg-blue-50 rounded-r-full" />
          )}
          {isStart && isEnd && (
            <div className="absolute inset-0" />
          )}
          <button
            onClick={() => {
              setCurrentMonth(displayMonth)
              handleDateClick(day)
            }}
            className={cn(
              "relative h-10 w-10 rounded-full flex items-center justify-center text-sm transition-colors z-10",
              (isStart || isEnd) && "bg-gray-900 text-white hover:bg-gray-800",
              !inRange && !isStart && !isEnd && "hover:bg-gray-100",
              isToday && !inRange && !isStart && !isEnd && "font-semibold"
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to && date.from.toDateString() !== date.to.toDateString() ? (
              <>
                {format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}
              </>
            ) : (
              format(date.from, "MMM dd, yyyy")
            )
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Select date range"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={date?.from && date?.to ? `${format(date.from, "MMM dd, yyyy")} - ${format(date.to, "MMM dd, yyyy")}` : ''}
            readOnly
          />
        </div>
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
      </PopoverContent>
    </Popover>
  )
}