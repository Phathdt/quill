import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NULL_OPERATORS, OPERATOR_GROUPS, OPERATOR_LABELS, RANGE_OPERATORS } from '@/lib/filter-constants'
import { filterSchema, type FilterFormData } from '@/lib/filter-schema'
import type { Column } from '@/types/database'
import type { FilterOperator, TableFilter } from '@/types/workspace'
import { ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

interface FilterRowProps {
  filter: TableFilter
  columns: Column[]
  onUpdate: (updates: Partial<TableFilter>) => void
  onRemove: () => void
}

export function FilterRow({ filter, columns, onUpdate, onRemove }: FilterRowProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: filter,
    mode: 'onChange',
  })

  const operator = watch('operator')
  const isNullOperator = NULL_OPERATORS.includes(operator)
  const isRangeOperator = RANGE_OPERATORS.includes(operator)

  // Sync external filter changes to form
  useEffect(() => {
    setValue('column', filter.column)
    setValue('operator', filter.operator)
    setValue('value', filter.value)
    setValue('value2', filter.value2 || '')
    setValue('enabled', filter.enabled)
  }, [filter, setValue])

  const handleColumnChange = (value: string) => {
    setValue('column', value)
    onUpdate({ column: value })
  }

  const handleOperatorChange = (value: string) => {
    setValue('operator', value as FilterOperator)
    onUpdate({ operator: value as FilterOperator })
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('value', e.target.value)
    onUpdate({ value: e.target.value })
  }

  const handleValue2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('value2', e.target.value)
    onUpdate({ value2: e.target.value })
  }

  return (
    <div className='flex flex-col gap-1 py-2'>
      <div className='flex items-center gap-2'>
        {/* Enable/Disable toggle */}
        <button
          type='button'
          onClick={() => onUpdate({ enabled: !filter.enabled })}
          className='text-muted-foreground hover:text-foreground transition-colors'
          title={filter.enabled ? 'Disable filter' : 'Enable filter'}
        >
          {filter.enabled ? <ToggleRight className='h-4 w-4 text-primary' /> : <ToggleLeft className='h-4 w-4' />}
        </button>

        {/* Column select */}
        <Select value={filter.column} onValueChange={handleColumnChange}>
          <SelectTrigger className={`w-[120px] h-8 text-xs ${errors.column ? 'border-destructive' : ''}`}>
            <SelectValue placeholder='Column' />
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col.name} value={col.name} className='text-xs'>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator select */}
        <Select value={filter.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className='w-[180px] h-8 text-xs'>
            <SelectValue placeholder='Operator' />
          </SelectTrigger>
          <SelectContent className='max-h-[300px]'>
            <SelectGroup>
              <SelectLabel className='text-xs text-muted-foreground'>Comparison</SelectLabel>
              {OPERATOR_GROUPS.comparison.map((op) => (
                <SelectItem key={op} value={op} className='text-xs'>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className='text-xs text-muted-foreground'>Set</SelectLabel>
              {OPERATOR_GROUPS.set.map((op) => (
                <SelectItem key={op} value={op} className='text-xs'>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className='text-xs text-muted-foreground'>Null</SelectLabel>
              {OPERATOR_GROUPS.null.map((op) => (
                <SelectItem key={op} value={op} className='text-xs'>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className='text-xs text-muted-foreground'>Range</SelectLabel>
              {OPERATOR_GROUPS.range.map((op) => (
                <SelectItem key={op} value={op} className='text-xs'>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className='text-xs text-muted-foreground'>Pattern</SelectLabel>
              {OPERATOR_GROUPS.pattern.map((op) => (
                <SelectItem key={op} value={op} className='text-xs'>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Value input(s) - hidden for NULL operators */}
        {!isNullOperator && (
          <>
            <Input
              {...register('value')}
              value={filter.value}
              onChange={handleValueChange}
              placeholder={isRangeOperator ? 'From' : 'Value'}
              className={`w-[100px] h-8 text-xs ${errors.value ? 'border-destructive' : ''}`}
            />
            {isRangeOperator && (
              <Input
                {...register('value2')}
                value={filter.value2 || ''}
                onChange={handleValue2Change}
                placeholder='To'
                className={`w-[100px] h-8 text-xs ${errors.value2 ? 'border-destructive' : ''}`}
              />
            )}
          </>
        )}

        {/* Remove button */}
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onRemove}
          className='h-8 w-8 text-muted-foreground hover:text-destructive'
        >
          <Trash2 className='h-3.5 w-3.5' />
        </Button>
      </div>

      {/* Validation errors */}
      {(errors.column || errors.value || errors.value2) && (
        <div className='flex gap-2 ml-6 text-[10px] text-destructive'>
          {errors.column && <span>{errors.column.message}</span>}
          {errors.value && <span>{errors.value.message}</span>}
          {errors.value2 && <span>{errors.value2.message}</span>}
        </div>
      )}
    </div>
  )
}
