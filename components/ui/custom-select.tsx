'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  className?: string
  dropUp?: boolean
  compact?: boolean
}

export function CustomSelect({ value, onChange, options, className = '', dropUp = false, compact = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [shouldDropUp, setShouldDropUp] = useState(dropUp)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      const dropdownHeight = options.length * 40 + 20 // Approximate height

      // If not enough space below and more space above, or if dropUp is forced
      setShouldDropUp(dropUp || (spaceBelow < dropdownHeight && spaceAbove > spaceBelow))
    }
  }, [isOpen, options.length, dropUp])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-colors"
      >
        <span className="text-gray-700">{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 ${shouldDropUp ? 'bottom-full mb-1' : 'top-full mt-1'} ${compact ? 'min-w-[80px]' : 'w-48'} bg-white border border-gray-200 rounded-md shadow-lg z-50`}>
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={`w-full ${compact ? 'px-3 py-1.5' : 'px-4 py-2'} text-sm text-left hover:bg-gray-50 flex items-center justify-between group transition-colors`}
              >
                <span className={`${value === option ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                  {option}
                </span>
                {value === option && compact ? null : value === option && (
                  <Check className="h-4 w-4 text-gray-700 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}