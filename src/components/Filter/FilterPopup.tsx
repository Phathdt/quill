import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { Column } from '@/types/database'
import type { TableFilter } from '@/types/workspace'
import { Filter, Plus, X } from 'lucide-react'
import { nanoid } from 'nanoid'

import { FilterRow } from './FilterRow'

interface FilterPopupProps {
  columns: Column[]
  onApply: () => void
}

export function FilterPopup({ columns, onApply }: FilterPopupProps) {
  const [open, setOpen] = useState(false)

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
  }

  const handleUpdateFilter = (filterId: string, updates: Partial<TableFilter>) => {
    if (!activeWorkspace || !activeTab) return
    updateTabFilter(activeWorkspace.id, activeTab.id, filterId, updates)
  }

  const handleRemoveFilter = (filterId: string) => {
    if (!activeWorkspace || !activeTab) return
    removeTabFilter(activeWorkspace.id, activeTab.id, filterId)
  }

  const handleClear = () => {
    if (!activeWorkspace || !activeTab) return
    clearTabFilters(activeWorkspace.id, activeTab.id)
  }

  const handleApply = () => {
    setOpen(false)
    onApply()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-7 text-xs gap-1.5'>
          <Filter className='h-3.5 w-3.5' />
          Filter
          {activeFilterCount > 0 && (
            <span className='ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px]'>
              {activeFilterCount}
            </span>
          )}
        </Button>
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
