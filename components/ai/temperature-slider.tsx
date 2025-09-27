import { Info } from 'lucide-react'

interface TemperatureSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function TemperatureSlider({
  value,
  onChange,
  min = 0,
  max = 2,
  step = 0.1,
  className = ''
}: TemperatureSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium text-gray-700">Temperature</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{value.toFixed(1)}</span>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute right-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              Lower values make the output more focused and deterministic, higher values make it more creative and random.
            </div>
          </div>
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
        `}</style>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">Focused</span>
          <span className="text-xs text-gray-500">Creative</span>
        </div>
      </div>
    </div>
  )
}