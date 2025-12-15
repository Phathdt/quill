import { useState } from 'react'

import { FilterPopup } from '@/components/Filter'
import { ImportDialog } from '@/components/Import/ImportDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { exportToCsv, exportToJson } from '@/lib/export'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { Column } from '@/types/database'
import { Download, History, PanelRight, Upload } from 'lucide-react'

interface GridToolbarProps {
  rowCount: number
  executionTime: number
  columns: Column[]
  rows: unknown[][]
  onApplyFilters?: () => void
  onRefresh?: () => void
}

export function GridToolbar({ rowCount, executionTime, columns, rows, onApplyFilters, onRefresh }: GridToolbarProps) {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setSidebarOpen = useWorkspaceManagerStore((s) => s.setSidebarOpen)
  const setSidebarRowIndex = useWorkspaceManagerStore((s) => s.setSidebarRowIndex)
  const [showImportDialog, setShowImportDialog] = useState(false)

  const isTableMode = activeTab?.type === 'table'
  const sidebarState = activeTab?.sidebarState
  const hasSelectedRow = rows.length > 0

  const handleExportCsv = () => {
    exportToCsv(columns, rows, 'query-result.csv')
  }

  const handleExportJson = () => {
    exportToJson(columns, rows, 'query-result.json')
  }

  const handleToggleSidebar = (mode: 'record' | 'history') => {
    if (!activeWorkspace || !activeTab) return

    if (sidebarState?.isOpen && sidebarState.mode === mode) {
      setSidebarOpen(activeWorkspace.id, activeTab.id, false)
    } else {
      // If opening record mode and no row selected, select first row
      if (mode === 'record' && sidebarState?.selectedRowIndex === null) {
        setSidebarRowIndex(activeWorkspace.id, activeTab.id, 0)
      }
      setSidebarOpen(activeWorkspace.id, activeTab.id, true, mode)
    }
  }

  return (
    <div className='flex items-center justify-between border-b border-border bg-card px-3 py-1.5 text-xs'>
      <div className='flex items-center gap-4'>
        <span className='text-foreground'>
          <span className='text-muted-foreground'>Rows:</span> {rowCount.toLocaleString()}
        </span>

        {/* Filter button - only in table mode */}
        {isTableMode && columns.length > 0 && <FilterPopup columns={columns} onApply={onApplyFilters || (() => {})} />}

        {/* Import button - only in table mode */}
        {isTableMode && activeTab?.tableName && (
          <Button size='sm' variant='ghost' onClick={() => setShowImportDialog(true)} className='h-7 text-xs'>
            <Upload className='h-3 w-3 mr-1' />
            Import
          </Button>
        )}
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <Button onClick={handleExportCsv} size='sm' variant='ghost' className='h-7 text-xs'>
            <Download className='h-3 w-3 mr-1' />
            CSV
          </Button>
          <Button onClick={handleExportJson} size='sm' variant='ghost' className='h-7 text-xs'>
            <Download className='h-3 w-3 mr-1' />
            JSON
          </Button>
        </div>
        <span className='text-muted-foreground'>
          Executed in{' '}
          <Badge variant='outline' className='text-emerald-400 border-emerald-400/30'>
            {executionTime}ms
          </Badge>
        </span>

        {/* Sidebar toggles */}
        <div className='flex items-center gap-1 border-l border-border pl-3'>
          <Button
            size='icon'
            variant={sidebarState?.isOpen && sidebarState.mode === 'record' ? 'secondary' : 'ghost'}
            className='h-7 w-7'
            onClick={() => handleToggleSidebar('record')}
            disabled={!hasSelectedRow}
            title='Record Detail (Cmd+D)'
          >
            <PanelRight className='h-4 w-4' />
          </Button>
          <Button
            size='icon'
            variant={sidebarState?.isOpen && sidebarState.mode === 'history' ? 'secondary' : 'ghost'}
            className='h-7 w-7'
            onClick={() => handleToggleSidebar('history')}
            title='Query History'
          >
            <History className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && activeTab?.tableName && activeWorkspace && (
        <ImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          tableName={activeTab.tableName}
          tableColumns={columns}
          workspaceId={activeWorkspace.id}
          onSuccess={() => {
            setShowImportDialog(false)
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
