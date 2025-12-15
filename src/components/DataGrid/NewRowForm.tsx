import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { parseValue } from '@/lib/value-parser'
import type { Column } from '@/types/database'

interface NewRowFormProps {
  columns: Column[]
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}

export function NewRowForm({ columns, onSubmit, onCancel }: NewRowFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setErrors({})

    try {
      const parsedValues: Record<string, unknown> = {}
      for (const col of columns) {
        const raw = values[col.name] ?? ''
        try {
          parsedValues[col.name] = parseValue(raw, col.typeName)
        } catch (e) {
          setErrors((prev) => ({ ...prev, [col.name]: (e as Error).message }))
          setIsSubmitting(false)
          return
        }
      }
      await onSubmit(parsedValues)
      onCancel() // Close on success
    } catch (e) {
      console.error('Insert failed:', e)
      setIsSubmitting(false)
    }
  }

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-card rounded-lg shadow-lg w-[500px] max-h-[80vh] flex flex-col'>
        <div className='px-4 py-3 border-b border-border'>
          <h3 className='font-semibold'>Insert New Row</h3>
        </div>

        <div className='flex-1 overflow-auto p-4 space-y-3'>
          {columns.map((col) => (
            <div key={col.name} className='space-y-1'>
              <label className='text-xs text-muted-foreground'>
                {col.name}
                <span className='ml-2 text-xs opacity-50'>({col.typeName})</span>
              </label>
              <Input
                value={values[col.name] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [col.name]: e.target.value }))}
                placeholder={`Enter ${col.name}...`}
                className={cn(errors[col.name] && 'border-destructive')}
              />
              {errors[col.name] && <p className='text-xs text-destructive'>{errors[col.name]}</p>}
            </div>
          ))}
        </div>

        <div className='px-4 py-3 border-t border-border flex justify-end gap-2'>
          <Button variant='ghost' onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Inserting...' : 'Insert Row'}
          </Button>
        </div>
      </div>
    </div>
  )
}
