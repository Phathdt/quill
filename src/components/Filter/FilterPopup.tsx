import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { filtersSchema } from '@/lib/filter-schema'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import type { Column } from '@/types/database'
import type { TableFilter } from '@/types/workspace'
import { AlertCircle, Filter, Plus, X } from 'lucide-react'
import { nanoid } from 'nanoid'

import { FilterRow } from './FilterRow'

interface FilterPopupProps {
  columns: Column[]
  onApply: () => void
  asTextButton?: boolean
}

export function FilterPopup({ columns, onApply, asTextButton }: FilterPopupProps) {
  const [open, setOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const addTabFilter = useWorkspaceManagerStore((s) => s.addTabFilter)
  const updateTabFilter = useWorkspaceManagerStore((s) => s.updateTabFilter)
  const removeTabFilter = useWorkspaceManagerStore((s) => s.removeTabFilter)
  const clearTabFilters = useWorkspaceManagerStore((s) => s.clearTabFilters)

  const filters = activeTab?.filters || []
  const activeFilterCount = filters.filter((f) => f.enabled).length

  const handleAddFilter = () => {
    if (!activeWorkspace || !activeTab) return
    const defaultColumn = columns[0]?.name || ''
    const newFilter: TableFilter = {
      id: nanoid(),
      column: defaultColumn,
      operator: '=',
      value: '',
      enabled: true,
    }
    addTabFilter(activeWorkspace.id, activeTab.id, newFilter)
    setValidationError(null)
  }

  const handleUpdateFilter = (filterId: string, updates: Partial<TableFilter>) => {
    if (!activeWorkspace || !activeTab) return
    updateTabFilter(activeWorkspace.id, activeTab.id, filterId, updates)
    setValidationError(null)
  }

  const handleRemoveFilter = (filterId: string) => {
    if (!activeWorkspace || !activeTab) return
    removeTabFilter(activeWorkspace.id, activeTab.id, filterId)
    setValidationError(null)
  }

  const handleClear = () => {
    if (!activeWorkspace || !activeTab) return
    clearTabFilters(activeWorkspace.id, activeTab.id)
    setValidationError(null)
  }

  const handleApply = () => {
    // Validate all enabled filters before applying
    const enabledFilters = filters.filter((f) => f.enabled)

    if (enabledFilters.length === 0) {
      // No filters to validate, just apply
      setOpen(false)
      setValidationError(null)
      onApply()
      return
    }

    const result = filtersSchema.safeParse(enabledFilters)

    if (!result.success) {
      // Show first validation error
      const firstError = result.error.issues[0]
      setValidationError(firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Invalid filter')
      return
    }

    setOpen(false)
    setValidationError(null)
    onApply()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {asTextButton ? (
          <Button
            variant={activeFilterCount > 0 ? 'secondary' : 'ghost'}
            size='sm'
            className='h-6 px-2.5 text-xs gap-1.5'
          >
            <Filter className='h-3 w-3' />
            Filters
            {activeFilterCount > 0 && (
              <span className='px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px]'>
                {activeFilterCount}
              </span>
            )}
          </Button>
        ) : (
          <Button variant='outline' size='sm' className='h-7 text-xs gap-1.5'>
            <Filter className='h-3.5 w-3.5' />
            Filter
            {activeFilterCount > 0 && (
              <span className='ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px]'>
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className='w-[650px] p-0' align='start'>
        <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
          <h4 className='text-sm font-medium'>Filters</h4>
          <button onClick={() => setOpen(false)} className='text-muted-foreground hover:text-foreground'>
            <X className='h-4 w-4' />
          </button>
        </div>

        <ScrollArea className='max-h-[300px]'>
          <div className='px-4 py-2'>
            {filters.length === 0 ? (
              <p className='text-sm text-muted-foreground py-4 text-center'>
                No filters. Click "Add Filter" to create one.
              </p>
            ) : (
              filters.map((filter) => (
                <FilterRow
                  key={filter.id}
                  filter={filter}
                  columns={columns}
                  onUpdate={(updates) => handleUpdateFilter(filter.id, updates)}
                  onRemove={() => handleRemoveFilter(filter.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Validation error banner */}
        {validationError && (
          <div className='flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-xs border-t border-destructive/20'>
            <AlertCircle className='h-3.5 w-3.5 shrink-0' />
            <span>{validationError}</span>
          </div>
        )}

        <div className='flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30'>
          <Button variant='ghost' size='sm' onClick={handleAddFilter} className='h-7 text-xs'>
            <Plus className='h-3.5 w-3.5 mr-1' />
            Add Filter
          </Button>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={handleClear} className='h-7 text-xs'>
              Clear All
            </Button>
            <Button size='sm' onClick={handleApply} className='h-7 text-xs'>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
