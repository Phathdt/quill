/* eslint-disable react-hooks/incompatible-library */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import { useExecuteQuery } from '@/hooks/useExecuteQuery'
import { useInlineEditing } from '@/hooks/useInlineEditing'
import { useTableFilter } from '@/hooks/useTableFilter'
import { deleteRows, getPrimaryKey, insertRow } from '@/lib/tauri'
import { toast } from '@/lib/toast'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import type { Column } from '@/types/database'
import type { SortState } from '@/types/workspace'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'

import { CellValue } from './cell-value'
import { ContextMenu } from './ContextMenu'
import { DataGridHeader } from './data-grid-header'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { EditingToolbar } from './EditingToolbar'
import { GridToolbar } from './GridToolbar'
import { NewRowForm } from './NewRowForm'
import { RowManager } from './RowManager'
import { useDataGridKeyboard } from './use-data-grid-keyboard'
import { useDataGridSelection } from './use-data-grid-selection'
import { VirtualRow } from './virtual-row'

type RowData = Record<string, string | number | boolean | null>

export function DataGrid() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setSidebarRowIndex = useWorkspaceManagerStore((s) => s.setSidebarRowIndex)
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)
  const addPendingNewRows = useWorkspaceManagerStore((s) => s.addPendingNewRows)
  const addPendingDeletes = useWorkspaceManagerStore((s) => s.addPendingDeletes)

  const parentRef = useRef<HTMLDivElement>(null)
  const { applyFilters } = useTableFilter()
  const { execute } = useExecuteQuery()

  const result = activeTab?.result ?? null
  const error = activeTab?.error ?? null
  const loading = activeTab?.loading ?? false
  const isTableMode = activeTab?.type === 'table'

  // Convert store sort state to TanStack Table format for display
  // Store uses column name, TanStack uses column index as id
  const sorting = useMemo<SortingState>(() => {
    if (!activeTab?.sort || !result?.columns) return []
    const colIndex = result.columns.findIndex((c) => c.name === activeTab.sort!.column)
    if (colIndex === -1) return []
    return [{ id: String(colIndex), desc: activeTab.sort.direction === 'desc' }]
  }, [activeTab?.sort, result?.columns])

  // Selection hook
  const {
    selectedRowIndex,
    setSelectedRowIndex,
    selectedRows,
    setSelectedRows,
    focusedCell,
    setFocusedCell,
    handleRowClick,
  } = useDataGridSelection()

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    cellValue: string | number | boolean | null
    rowData: RowData
  } | null>(null)

  // Row management dialogs
  const [showNewRowForm, setShowNewRowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Inline editing hook
  const { editingState, startEditing, commitCellEdit, cancelEditing, savePendingChanges, discardPendingChanges } =
    useInlineEditing()

  // Handle sorting changes - for table tabs, use server-side sorting
  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      // Get fresh state to avoid stale closure
      const store = useWorkspaceManagerStore.getState()
      const workspace = store.getActiveWorkspace()
      const tab = store.getActiveTab()

      if (!workspace || !tab) return

      // Compute current sorting state from store
      const currentSorting: SortingState = (() => {
        if (!tab.sort || !tab.result?.columns) return []
        const colIndex = tab.result.columns.findIndex((c) => c.name === tab.sort!.column)
        if (colIndex === -1) return []
        return [{ id: String(colIndex), desc: tab.sort.direction === 'desc' }]
      })()

      const newSorting = typeof updater === 'function' ? updater(currentSorting) : updater

      // For table tabs, update store and re-execute query
      if (tab.type === 'table') {
        let newSort: SortState | undefined
        if (newSorting.length > 0) {
          // Find the column name from the column index
          const sortCol = newSorting[0]
          const colIndex = parseInt(sortCol.id, 10)
          const colName = tab.result?.columns?.[colIndex]?.name
          if (colName) {
            newSort = { column: colName, direction: sortCol.desc ? 'desc' : 'asc' }
          }
        }

        store.setTabSort(workspace.id, tab.id, newSort)
        // Execute after state update
        setTimeout(() => execute(), 0)
      }
    },
    [execute]
  )

  // Get pending state from editing state
  const pendingNewRows = useMemo(() => editingState?.pendingNewRows ?? [], [editingState?.pendingNewRows])
  const pendingDeletes = useMemo(() => new Set(editingState?.pendingDeletes ?? []), [editingState?.pendingDeletes])
  const editingCell = editingState?.editingCell ?? null
  const pendingChanges = useMemo(() => editingState?.pendingChanges ?? {}, [editingState?.pendingChanges])

  // Combine existing rows with pending new rows
  const data = useMemo(() => {
    if (!result?.rows) return []

    const existingRows = result.rows.map((row: unknown[]) =>
      Object.fromEntries(row.map((val: unknown, idx: number) => [String(idx), val as string | number | boolean | null]))
    )

    const newRowsData = pendingNewRows.map((pendingRow) => {
      const rowData: RowData = { __isPendingNew: true, __tempId: pendingRow.tempId } as RowData
      if (result?.columns) {
        result.columns.forEach((col, idx) => {
          rowData[String(idx)] = (pendingRow.values[col.name] as string | number | boolean | null) ?? null
        })
      }
      return rowData
    })

    return [...existingRows, ...newRowsData]
  }, [result?.rows, result?.columns, pendingNewRows])

  // Check if a cell has pending changes
  const getCellPendingValue = useCallback(
    (rowIndex: number, columnName: string) => {
      const key = `${rowIndex}:${columnName}`
      return pendingChanges[key]?.newValue
    },
    [pendingChanges]
  )

  // Column definitions - no checkbox, use Cmd+click / Shift+click for multi-select
  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    if (!result?.columns) return []

    return result.columns.map((col: Column, idx: number) => ({
      accessorKey: String(idx),
      header: col.name,
      size: 150,
      meta: { columnIndex: idx, columnName: col.name, columnType: col.typeName },
      cell: (info: { getValue: () => unknown; row: { index: number } }) => {
        const rowIndex = info.row.index
        const pendingValue = getCellPendingValue(rowIndex, col.name)
        const hasPending = pendingValue !== undefined
        const displayValue = hasPending ? pendingValue : info.getValue()

        if (isTableMode && hasPending) {
          return (
            <div className='truncate bg-amber-500/20 border-l-2 border-amber-500 pl-2 -ml-1'>
              <CellValue value={displayValue} />
            </div>
          )
        }

        return <CellValue value={displayValue} />
      },
    }))
  }, [result?.columns, isTableMode, getCellPendingValue])

  // Table instance
  // For table tabs: use manual sorting (server-side) - data already sorted from DB
  // For query tabs: use client-side sorting
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    // Only use client-side sorting for non-table tabs
    getSortedRowModel: isTableMode ? undefined : getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableSorting: true,
    manualSorting: isTableMode, // Server-side sorting for table tabs
  })

  const { rows } = table.getRowModel()

  // Force scrollbar repaint on resize (Tauri WebView/WebKit bug fix)
  // Uses double-RAF to ensure proper paint cycle completion
  useLayoutEffect(() => {
    const element = parentRef.current
    if (!element) return

    let rafId: number | null = null
    let timeoutId: NodeJS.Timeout | null = null

    const forceScrollbarRepaint = () => {
      // Cancel any pending repaint
      if (rafId) cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)

      // Double RAF ensures we wait for actual paint
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          // Toggle a CSS property that forces compositor update
          element.style.transform = 'translateZ(0)'
          timeoutId = setTimeout(() => {
            element.style.transform = ''
          }, 0)
        })
      })
    }

    const resizeObserver = new ResizeObserver(forceScrollbarRepaint)
    resizeObserver.observe(element)

    // Also trigger on window resize
    window.addEventListener('resize', forceScrollbarRepaint)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', forceScrollbarRepaint)
      if (rafId) cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  })

  // Keyboard shortcuts hook
  useDataGridKeyboard({
    selectedRowIndex,
    selectedRows,
    setSelectedRows,
    focusedCell,
    setFocusedCell,
    editingCell,
    startEditing,
    cancelEditing,
    pendingChanges,
    pendingNewRows,
    pendingDeletes,
    savePendingChanges,
    rows,
    columns: result?.columns,
    result,
    isTableMode,
    addPendingNewRows,
    addPendingDeletes,
    activeWorkspace,
    activeTab,
  })

  // Scroll focused cell into view
  useEffect(() => {
    if (focusedCell && parentRef.current) {
      const rowEl = parentRef.current.querySelector(`[data-index="${focusedCell.row}"]`)
      rowEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedCell])

  // Clear focus when switching away from table mode
  useEffect(() => {
    if (!isTableMode) {
      setFocusedCell(null)
    }
  }, [isTableMode, setFocusedCell])

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedRowIndex(null)
    setSelectedRows(new Set())
    setFocusedCell(null)
  }, [activeTab?.id, setSelectedRowIndex, setSelectedRows, setFocusedCell])

  // Row click handler wrapper
  const onRowClick = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      handleRowClick(rowIndex, e, {
        isTableMode,
        onSidebarUpdate: (idx) => {
          if (activeWorkspace && activeTab) {
            setSidebarRowIndex(activeWorkspace.id, activeTab.id, idx)
          }
        },
      })
    },
    [handleRowClick, isTableMode, activeWorkspace, activeTab, setSidebarRowIndex]
  )

  // Insert row handler
  const handleInsertRow = async (values: Record<string, unknown>) => {
    if (!activeWorkspace || !activeTab?.tableName || !result) return

    const columnValues = Object.entries(values).map(([column, value]) => ({ column, value }))

    try {
      const insertResult = await insertRow(activeWorkspace.id, activeTab.tableName, columnValues)

      if (insertResult.rows.length > 0) {
        const newRows = [...result.rows, insertResult.rows[0]]
        setTabResult(activeWorkspace.id, activeTab.id, { ...result, rows: newRows })
        toast.success('Row inserted successfully')
      }
    } catch (e) {
      toast.error(`Insert failed: ${e}`)
      throw e
    }
  }

  // Delete selected rows handler
  const handleDeleteSelected = async () => {
    if (!activeWorkspace || !activeTab?.tableName || !result) return

    try {
      const pkColumns = await getPrimaryKey(activeWorkspace.id, activeTab.tableName)
      if (pkColumns.length === 0) {
        toast.error('Cannot delete: No primary key found')
        return
      }

      const rowsToDelete = Array.from(selectedRows).map((rowIndex) => {
        const row = result.rows[rowIndex]
        return pkColumns.map((pkCol) => {
          const colIndex = result.columns.findIndex((c) => c.name === pkCol)
          return { column: pkCol, value: row[colIndex] }
        })
      })

      await deleteRows(activeWorkspace.id, activeTab.tableName, rowsToDelete)

      const remainingRows = result.rows.filter((_, idx) => !selectedRows.has(idx))
      setTabResult(activeWorkspace.id, activeTab.id, { ...result, rows: remainingRows })

      setSelectedRows(new Set())
      toast.success(`Deleted ${rowsToDelete.length} row(s)`)
    } catch (e) {
      toast.error(`Delete failed: ${e}`)
      throw e
    }
  }

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, cellValue: unknown, rowData: RowData) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      cellValue: cellValue as string | number | boolean | null,
      rowData,
    })
  }, [])

  // Early returns for loading/error states
  if (!activeTab) return null

  if (error) {
    return (
      <div className='flex flex-1 items-center justify-center p-4 bg-background'>
        <div className='max-w-lg rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive'>
          <div className='flex items-center gap-2 font-medium mb-2'>
            <AlertCircle className='h-5 w-5' />
            Query Error
          </div>
          <pre className='text-sm whitespace-pre-wrap font-mono'>{error}</pre>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='flex flex-1 items-center justify-center bg-background'>
        <div className='flex items-center gap-3 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin text-primary' />
          Executing query...
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center text-muted-foreground bg-background'>
        <FileText className='w-16 h-16 mb-4 opacity-50' strokeWidth={1} />
        <p className='text-lg'>Run a query to see results</p>
        <p className='text-sm mt-1'>Write SQL in the editor above and press Execute</p>
      </div>
    )
  }

  const headerGroups = table.getHeaderGroups()
  const totalWidth = table.getTotalSize()

  return (
    <div className='grid grid-rows-[auto_auto_1fr_auto] h-full overflow-hidden bg-background'>
      <EditingToolbar onSave={savePendingChanges} onDiscard={discardPendingChanges} />

      {isTableMode && (
        <div className='flex items-center px-3 py-1 border-b border-border bg-card'>
          <RowManager
            onAddRow={() => setShowNewRowForm(true)}
            onDeleteSelected={() => setShowDeleteConfirm(true)}
            selectedRowCount={selectedRows.size}
            canEdit={isTableMode}
          />
        </div>
      )}

      {/* Main scroll area - takes remaining height via grid 1fr */}
      <div ref={parentRef} className='data-grid-scroll min-h-0'>
        <div style={{ width: totalWidth, minWidth: totalWidth }}>
          <DataGridHeader headerGroups={headerGroups} table={table} />

          {/* Virtual Rows */}
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              const isRowSelected = selectedRows.has(virtualRow.index) || selectedRowIndex === virtualRow.index
              const isPendingNewRow = row.original.__isPendingNew === true
              const isPendingDelete = pendingDeletes.has(virtualRow.index)

              return (
                <VirtualRow
                  key={row.id}
                  row={row}
                  virtualRow={virtualRow}
                  totalWidth={totalWidth}
                  isSelected={isRowSelected}
                  isPendingNewRow={isPendingNewRow}
                  isPendingDelete={isPendingDelete}
                  focusedCell={focusedCell}
                  setFocusedCell={setFocusedCell}
                  editingCell={editingCell}
                  isTableMode={isTableMode}
                  onRowClick={onRowClick}
                  onCellDoubleClick={startEditing}
                  onContextMenu={handleContextMenu}
                  getCellPendingValue={getCellPendingValue}
                  onCommitEdit={commitCellEdit}
                  onCancelEdit={cancelEditing}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <GridToolbar
        rowCount={rows.length}
        executionTime={result.executionTimeMs}
        columns={result.columns}
        rows={result.rows}
        onApplyFilters={applyFilters}
        onRefresh={applyFilters}
      />

      {/* Context Menu */}
      {contextMenu && result?.columns && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          cellValue={contextMenu.cellValue}
          rowData={contextMenu.rowData}
          allRows={data}
          columns={result.columns}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* New Row Form */}
      {showNewRowForm && result?.columns && (
        <NewRowForm columns={result.columns} onSubmit={handleInsertRow} onCancel={() => setShowNewRowForm(false)} />
      )}

      {/* Delete Confirm Dialog */}
      {showDeleteConfirm && activeTab?.tableName && (
        <DeleteConfirmDialog
          rowCount={selectedRows.size}
          tableName={activeTab.tableName}
          isOpen={showDeleteConfirm}
          onConfirm={handleDeleteSelected}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
