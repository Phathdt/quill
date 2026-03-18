import { useEffect, useRef } from 'react'

import { useExecuteQuery } from '@/hooks/useExecuteQuery'
import { sanitizeSqlIdentifier } from '@/lib/utils'
import { useSchemaStore } from '@/stores/schemaStore'
import { useTableFinderStore } from '@/stores/tableFinderStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { Command } from 'cmdk'
import { Search, Table } from 'lucide-react'

export function TableFinderModal() {
  const { isOpen, close } = useTableFinderStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const findTableTab = useWorkspaceManagerStore((s) => s.findTableTab)
  const switchTab = useWorkspaceManagerStore((s) => s.switchTab)

  const tables = useSchemaStore((s) => (activeWorkspace ? s.getTables(activeWorkspace.id) : []))

  const { execute } = useExecuteQuery()

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  const handleSelect = async (tableName: string) => {
    if (!activeWorkspace) return
    close()

    const safeTableName = sanitizeSqlIdentifier(tableName)
    const existingTabId = findTableTab(activeWorkspace.id, safeTableName)
    if (existingTabId) {
      switchTab(activeWorkspace.id, existingTabId)
      return
    }

    createTab(activeWorkspace.id, 'table', tableName, safeTableName)
    await execute()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm' onClick={close} />

      {/* Dialog */}
      <div className='fixed left-1/2 top-[30%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2'>
        <Command
          className='rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden'
          shouldFilter={true}
        >
          {/* Search input */}
          <div className='flex items-center border-b border-border px-3'>
            <Search className='mr-2 h-4 w-4 shrink-0 opacity-50' />
            <Command.Input
              ref={inputRef}
              placeholder='Go to table...'
              className='flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground'
            />
          </div>

          {/* Table list */}
          <Command.List className='max-h-72 overflow-y-auto p-1'>
            <Command.Empty className='py-6 text-center text-sm text-muted-foreground'>
              No tables found.
            </Command.Empty>

            {tables.length > 0 && (
              <Command.Group heading='Tables'>
                {tables.map((tableName) => (
                  <Command.Item
                    key={tableName}
                    value={tableName}
                    onSelect={handleSelect}
                    className='flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground'
                  >
                    <Table className='h-4 w-4 text-muted-foreground shrink-0' />
                    <span className='font-mono'>{tableName}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className='flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <kbd className='px-1.5 py-0.5 bg-muted rounded border border-border'>
                <span className='text-[10px]'>esc</span>
              </kbd>
              <span>to close</span>
            </div>
            <div className='flex items-center gap-2'>
              <kbd className='px-1.5 py-0.5 bg-muted rounded border border-border'>
                <span className='text-[10px]'>Enter</span>
              </kbd>
              <span>to open table</span>
            </div>
          </div>
        </Command>
      </div>
    </>
  )
}
