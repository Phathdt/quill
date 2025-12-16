import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { Check, ChevronDown, ChevronUp, Copy, X } from 'lucide-react'

export function RecordDetailSidebar() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setSidebarOpen = useWorkspaceManagerStore((s) => s.setSidebarOpen)
  const navigateSidebarRow = useWorkspaceManagerStore((s) => s.navigateSidebarRow)

  const sidebarState = activeTab?.sidebarState
  const result = activeTab?.result
  const rowIndex = sidebarState?.selectedRowIndex ?? 0
  const rowData = result?.rows[rowIndex]
  const columns = useMemo(() => result?.columns ?? [], [result?.columns])

  // Local editing state
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Define handleClose before useEffect that uses it
  const handleClose = useCallback(() => {
    if (activeWorkspace && activeTab) {
      setSidebarOpen(activeWorkspace.id, activeTab.id, false)
    }
  }, [activeWorkspace, activeTab, setSidebarOpen])

  // Compute edit values from row data - no useEffect needed
  const computedEditValues = useMemo(() => {
    if (!rowData || columns.length === 0) return {}
    const values: Record<string, string> = {}
    columns.forEach((col, idx) => {
      values[col.name] = rowData[idx] === null ? '' : String(rowData[idx])
    })
    return values
  }, [rowData, columns])

  // Sync computed values to state only when explicitly editing
  useEffect(() => {
    setEditValues(computedEditValues)
  }, [computedEditValues])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sidebarState?.isOpen) return

      if (e.key === 'ArrowUp' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (activeWorkspace && activeTab) {
          navigateSidebarRow(activeWorkspace.id, activeTab.id, 'prev')
        }
      } else if (e.key === 'ArrowDown' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (activeWorkspace && activeTab) {
          navigateSidebarRow(activeWorkspace.id, activeTab.id, 'next')
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarState?.isOpen, activeWorkspace, activeTab, navigateSidebarRow, handleClose])

  if (!sidebarState?.isOpen || sidebarState.mode !== 'record' || !rowData) {
    return null
  }

  const handleCopy = async (fieldName: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 1500)
  }

  const totalRows = result?.rows.length ?? 0

  return (
    <div className='w-[400px] h-full border-l border-border bg-card flex flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
        <div className='flex items-center gap-2'>
          <h3 className='font-semibold text-sm'>Record Detail</h3>
          <span className='text-xs text-muted-foreground'>
            {rowIndex + 1} of {totalRows}
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            size='icon'
            variant='ghost'
            className='h-7 w-7'
            onClick={() => navigateSidebarRow(activeWorkspace!.id, activeTab!.id, 'prev')}
            disabled={rowIndex <= 0}
          >
            <ChevronUp className='h-4 w-4' />
          </Button>
          <Button
            size='icon'
            variant='ghost'
            className='h-7 w-7'
            onClick={() => navigateSidebarRow(activeWorkspace!.id, activeTab!.id, 'next')}
            disabled={rowIndex >= totalRows - 1}
          >
            <ChevronDown className='h-4 w-4' />
          </Button>
          <Button size='icon' variant='ghost' className='h-7 w-7' onClick={handleClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Fields */}
      <ScrollArea className='flex-1'>
        <div className='p-4 space-y-4'>
          {columns.map((col, idx) => {
            const value = editValues[col.name] ?? ''
            const isNull = rowData[idx] === null

            return (
              <div key={col.name} className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <label className='text-xs font-medium text-muted-foreground'>{col.name}</label>
                    <span className='text-[10px] text-muted-foreground/50'>{col.typeName}</span>
                  </div>
                  <Button size='icon' variant='ghost' className='h-5 w-5' onClick={() => handleCopy(col.name, value)}>
                    {copiedField === col.name ? (
                      <Check className='h-3 w-3 text-green-500' />
                    ) : (
                      <Copy className='h-3 w-3' />
                    )}
                  </Button>
                </div>

                {isNull ? (
                  <div className='px-3 py-2 text-sm text-muted-foreground/50 italic bg-muted/30 rounded-md'>NULL</div>
                ) : (
                  <Input
                    value={value}
                    onChange={(e) =>
                      setEditValues((v) => ({
                        ...v,
                        [col.name]: e.target.value,
                      }))
                    }
                    className={cn('text-sm font-mono', activeTab?.type === 'query' && 'bg-muted cursor-default')}
                    readOnly={activeTab?.type === 'query'}
                  />
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer - Save button (table mode only) */}
      {activeTab?.type === 'table' && (
        <div className='px-4 py-3 border-t border-border'>
          <Button className='w-full' size='sm'>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}
