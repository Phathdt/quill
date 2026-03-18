import { useState } from 'react'

import { FilterPopup } from '@/components/Filter'
import { ImportDialog } from '@/components/Import/ImportDialog'
import { Button } from '@/components/ui/button'
import { useExecuteQuery } from '@/hooks/useExecuteQuery'
import { exportToCsv } from '@/lib/export'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import type { Column } from '@/types/database'
import { PAGE_SIZE_OPTIONS } from '@/types/workspace'
import { ChevronLeft, ChevronRight, Download, History, LayoutGrid, Plus, Table2, Trash2, Upload } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface GridToolbarProps {
  rowCount: number
  executionTime: number
  columns: Column[]
  rows: unknown[][]
  onApplyFilters?: () => void
  onRefresh?: () => void
  onAddRow?: () => void
  onDeleteSelected?: () => void
  selectedRowCount?: number
  activeView?: 'data' | 'structure'
  onViewChange?: (view: 'data' | 'structure') => void
}

export function GridToolbar({
  rowCount,
  executionTime,
  columns,
  rows,
  onApplyFilters,
  onRefresh,
  onAddRow,
  onDeleteSelected,
  selectedRowCount = 0,
  activeView = 'data',
  onViewChange,
}: GridToolbarProps) {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabPagination = useWorkspaceManagerStore((s) => s.setTabPagination)
  const setSidebarOpen = useWorkspaceManagerStore((s) => s.setSidebarOpen)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const { execute, loading } = useExecuteQuery()

  const isTableMode = activeTab?.type === 'table'
  const sidebarState = activeTab?.sidebarState
  const pagination = activeTab?.pagination

  const handleExportCsv = () => exportToCsv(columns, rows, 'query-result.csv')

  const handlePageChange = async (newPage: number) => {
    if (!activeWorkspace || !activeTab || loading) return
    setTabPagination(activeWorkspace.id, activeTab.id, { page: newPage })
    setTimeout(() => execute(), 0)
  }

  const handlePageSizeChange = async (newPageSize: number) => {
    if (!activeWorkspace || !activeTab || loading) return
    setTabPagination(activeWorkspace.id, activeTab.id, { page: 1, pageSize: newPageSize })
    setTimeout(() => execute(), 0)
  }

  const handleToggleHistory = () => {
    if (!activeWorkspace || !activeTab) return
    if (sidebarState?.isOpen && sidebarState.mode === 'history') {
      setSidebarOpen(activeWorkspace.id, activeTab.id, false)
    } else {
      setSidebarOpen(activeWorkspace.id, activeTab.id, true, 'history')
    }
  }

  // Pagination display values
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize)) : 1
  const startRow = pagination && pagination.totalCount > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0
  const endRow = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.totalCount) : 0
  const canGoPrev = pagination ? pagination.page > 1 : false
  const canGoNext = pagination ? pagination.page < totalPages : false

  return (
    <div className='flex items-center border-t border-border bg-card px-2 h-9 text-xs gap-1'>
      {/* ── Left: view tabs + utility buttons ── */}
      <div className='flex items-center gap-0.5'>
        {isTableMode ? (
          <>
            {/* Data / Structure tabs */}
            <Button
              size='sm'
              variant={activeView === 'data' ? 'secondary' : 'ghost'}
              className='h-6 px-2.5 text-xs rounded-sm gap-1.5'
              onClick={() => onViewChange?.('data')}
            >
              <LayoutGrid className='h-3 w-3' />
              Data
            </Button>
            <Button
              size='sm'
              variant={activeView === 'structure' ? 'secondary' : 'ghost'}
              className='h-6 px-2.5 text-xs rounded-sm gap-1.5 text-muted-foreground'
              onClick={() => onViewChange?.('structure')}
            >
              <Table2 className='h-3 w-3' />
              Structure
            </Button>

            {/* Row actions */}
            {onAddRow && (
              <>
                <div className='w-px h-4 bg-border mx-0.5' />
                <Button size='sm' variant='ghost' className='h-6 px-2.5 text-xs rounded-sm gap-1.5' onClick={onAddRow}>
                  <Plus className='h-3 w-3' />
                  Row
                </Button>
              </>
            )}
            {onDeleteSelected && selectedRowCount > 0 && (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 px-2.5 text-xs rounded-sm gap-1.5 text-destructive hover:text-destructive'
                onClick={onDeleteSelected}
              >
                <Trash2 className='h-3 w-3' />
                Delete ({selectedRowCount})
              </Button>
            )}
          </>
        ) : (
          <span className='px-2 text-muted-foreground'>
            Rows: <span className='text-foreground'>{rowCount.toLocaleString()}</span>
          </span>
        )}
      </div>

      {/* ── Divider ── */}
      {isTableMode && <div className='w-px h-4 bg-border mx-1' />}

      {/* ── Utility buttons (import / export / history) ── */}
      <div className='flex items-center gap-0.5'>
        {isTableMode && activeTab?.tableName && (
          <Button
            size='icon'
            variant='ghost'
            className='h-6 w-6'
            onClick={() => setShowImportDialog(true)}
            title='Import'
          >
            <Upload className='h-3 w-3' />
          </Button>
        )}
        <Button size='icon' variant='ghost' className='h-6 w-6' onClick={handleExportCsv} title='Export CSV'>
          <Download className='h-3 w-3' />
        </Button>
        <Button
          size='icon'
          variant={sidebarState?.isOpen && sidebarState.mode === 'history' ? 'secondary' : 'ghost'}
          className='h-6 w-6'
          onClick={handleToggleHistory}
          title='Query History'
        >
          <History className='h-3 w-3' />
        </Button>
      </div>

      {/* ── Center: pagination info ── */}
      <div className='flex-1 flex items-center justify-center'>
        {isTableMode && pagination ? (
          <span className='text-muted-foreground whitespace-nowrap'>
            {pagination.totalCount > 0 ? (
              <>
                <span className='text-foreground'>{startRow.toLocaleString()}</span>
                {'–'}
                <span className='text-foreground'>{endRow.toLocaleString()}</span>
                {' of '}
                <span className='text-foreground'>~{pagination.totalCount.toLocaleString()}</span>
                {' rows'}
              </>
            ) : (
              'No rows'
            )}
          </span>
        ) : (
          <span className='text-muted-foreground'>{executionTime}ms</span>
        )}
      </div>

      {/* ── Right: Filters + pagination nav ── */}
      <div className='flex items-center gap-1'>
        {/* Filters button */}
        {isTableMode && columns.length > 0 && (
          <FilterPopup columns={columns} onApply={onApplyFilters || (() => {})} asTextButton />
        )}

        {/* Pagination nav */}
        {isTableMode && pagination && (
          <>
            <div className='w-px h-4 bg-border mx-0.5' />
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(v) => handlePageSizeChange(Number(v))}
              disabled={loading}
            >
              <SelectTrigger className='h-6 w-[58px] text-xs border-0 shadow-none bg-transparent focus:ring-0'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()} className='text-xs'>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size='icon'
              variant='ghost'
              className='h-6 w-6'
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={loading || !canGoPrev}
              title='Previous page'
            >
              <ChevronLeft className='h-3.5 w-3.5' />
            </Button>
            <span className='text-xs text-muted-foreground px-1 min-w-[3rem] text-center'>
              {pagination.page} / {totalPages}
            </span>
            <Button
              size='icon'
              variant='ghost'
              className='h-6 w-6'
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={loading || !canGoNext}
              title='Next page'
            >
              <ChevronRight className='h-3.5 w-3.5' />
            </Button>
          </>
        )}
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
