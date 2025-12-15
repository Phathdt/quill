import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatValue, parseValue } from '@/lib/value-parser'

interface EditableCellProps {
  value: unknown
  columnName: string
  columnType: string
  rowIndex: number
  columnIndex: number
  isEditing: boolean
  isPending: boolean
  onStartEdit: () => void
  onCommit: (value: unknown) => void
  onCancel: () => void
}

export function EditableCell({
  value,
  columnType,
  isEditing,
  isPending,
  onStartEdit,
  onCommit,
  onCancel,
}: EditableCellProps) {
  const [editValue, setEditValue] = useState(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      try {
        const parsed = parseValue(editValue, columnType)
        onCommit(parsed)
      } catch (error) {
        console.error('Parse error:', error)
        onCancel()
      }
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const handleBlur = () => {
    try {
      const parsed = parseValue(editValue, columnType)
      onCommit(parsed)
    } catch (error) {
      console.error('Parse error:', error)
      onCancel()
    }
  }

  if (!isEditing) {
    return (
      <div
        className={cn('px-3 py-1.5 truncate cursor-text', isPending && 'bg-amber-500/20 border-l-2 border-amber-500')}
        onDoubleClick={onStartEdit}
      >
        {formatValue(value)}
      </div>
    )
  }

  return (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className='w-full h-full px-2 bg-background border border-primary outline-none'
    />
  )
}
