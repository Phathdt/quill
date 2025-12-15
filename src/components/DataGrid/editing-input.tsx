import { useEffect, useRef, useState } from 'react'

import { formatValue } from '@/lib/value-parser'

interface EditingInputProps {
  initialValue: unknown
  columnType: string
  onCommit: (value: unknown) => void
  onCancel: () => void
}

/**
 * Inline editing input for grid cells
 * - Auto-focuses and selects text on mount
 * - Enter commits, Escape cancels
 * - Blur commits (unless cancelled)
 */
export function EditingInput({ initialValue, columnType, onCommit, onCancel }: EditingInputProps) {
  const [value, setValue] = useState(formatValue(initialValue))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      onCommit(parseInputValue(value, columnType))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  const handleBlur = () => {
    onCommit(parseInputValue(value, columnType))
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className='w-full h-full px-2 bg-background border border-primary rounded-sm outline-none text-xs font-mono focus:ring-1 focus:ring-primary'
      onClick={(e) => e.stopPropagation()}
    />
  )
}

/**
 * Parse input string to typed value based on column type
 */
function parseInputValue(value: string, columnType: string): unknown {
  const lowerType = columnType.toLowerCase()

  if (value === '' || value.toLowerCase() === 'null') return null

  if (lowerType.includes('bool')) {
    return value.toLowerCase() === 'true' || value === '1'
  }

  if (lowerType.includes('int') || lowerType === 'serial' || lowerType === 'bigserial') {
    const num = parseInt(value, 10)
    return isNaN(num) ? value : num
  }

  if (
    lowerType.includes('float') ||
    lowerType.includes('double') ||
    lowerType.includes('numeric') ||
    lowerType.includes('decimal')
  ) {
    const num = parseFloat(value)
    return isNaN(num) ? value : num
  }

  if (lowerType.includes('json')) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  return value
}
