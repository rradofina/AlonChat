'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  className?: string
  onCheckedChange?: (checked: boolean) => void
  onChange?: React.ChangeEventHandler<HTMLInputElement>
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', checked, onChange, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative inline-block">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={onChange || (() => {})}
          className="sr-only"
          {...props}
        />
        <div
          onClick={() => {
            const newChecked = !checked
            if (onCheckedChange) {
              onCheckedChange(newChecked)
            } else if (onChange) {
              onChange({ target: { checked: newChecked } } as any)
            }
          }}
          className={`
            w-4 h-4 border rounded cursor-pointer transition-all duration-200 flex items-center justify-center
            ${checked
              ? 'bg-gray-900 border-gray-900'
              : 'bg-white border-gray-300 hover:border-gray-400'
            }
            ${className}
          `}
        >
          {checked && (
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'