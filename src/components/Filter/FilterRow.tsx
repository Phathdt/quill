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
  const isNullOperator = NULL_OPERATORS.includes(filter.operator)
  const isRangeOperator = RANGE_OPERATORS.includes(filter.operator)

  return (
    <div className='flex items-center gap-2 py-2'>
      {/* Enable/Disable toggle */}
      <button
        onClick={() => onUpdate({ enabled: !filter.enabled })}
        className='text-muted-foreground hover:text-foreground transition-colors'
        title={filter.enabled ? 'Disable filter' : 'Enable filter'}
      >
        {filter.enabled ? <ToggleRight className='h-4 w-4 text-primary' /> : <ToggleLeft className='h-4 w-4' />}
      </button>

      {/* Column select */}
      <Select value={filter.column} onValueChange={(v) => onUpdate({ column: v })}>
        <SelectTrigger className='w-[120px] h-8 text-xs'>
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
      <Select value={filter.operator} onValueChange={(v) => onUpdate({ operator: v as FilterOperator })}>
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
            value={filter.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder={isRangeOperator ? 'From' : 'Value'}
            className='w-[100px] h-8 text-xs'
          />
          {isRangeOperator && (
            <Input
              value={filter.value2 || ''}
              onChange={(e) => onUpdate({ value2: e.target.value })}
              placeholder='To'
              className='w-[100px] h-8 text-xs'
            />
          )}
        </>
      )}

      {/* Remove button */}
      <Button
        variant='ghost'
        size='icon'
        onClick={onRemove}
        className='h-8 w-8 text-muted-foreground hover:text-destructive'
      >
        <Trash2 className='h-3.5 w-3.5' />
      </Button>
    </div>
  )
}
