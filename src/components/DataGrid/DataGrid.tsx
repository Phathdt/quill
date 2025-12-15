/* eslint-disable react-hooks/incompatible-library */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import { Checkbox } from '@/components/ui/checkbox'
import { useInlineEditing } from '@/hooks/useInlineEditing'
import { useTableFilter } from '@/hooks/useTableFilter'
import { copyRowsToClipboard, copyRowToClipboard, readClipboardAsCSV } from '@/lib/clipboard'
import { deleteRows, getPrimaryKey, insertRow } from '@/lib/tauri'
import { toast } from '@/lib/toast'
import { formatValue } from '@/lib/value-parser'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { Column } from '@/types/database'
import { AlertCircle, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react'

import { ContextMenu } from './ContextMenu'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { EditingToolbar } from './EditingToolbar'
import { GridToolbar } from './GridToolbar'
import { NewRowForm } from './NewRowForm'
import { RowManager } from './RowManager'

type RowData = Record<string, string | number | boolean | null>

export function DataGrid() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setSidebarRowIndex = useWorkspaceManagerStore((s) => s.setSidebarRowIndex)
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)
  const parentRef = useRef<HTMLDivElement>(null)
  const { applyFilters } = useTableFilter()

  const result = activeTab?.result ?? null
  const error = activeTab?.error ?? null
  const loading = activeTab?.loading ?? false

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Row selection state
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  // Multi-row selection for delete
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // Focused cell for arrow key navigation
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)

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
  const { isTableMode, editingState, startEditing, commitCellEdit, cancelEditing, savePendingChanges, discardPendingChanges } =
    useInlineEditing()

  const data = useMemo(() => {
    if (!result?.rows) return []
    return result.rows.map((row: unknown[]) =>
      Object.fromEntries(row.map((val: unknown, idx: number) => [String(idx), val as string | number | boolean | null]))
    )
  }, [result?.rows])

  // Get editing cell from state
  const editingCell = editingState?.editingCell ?? null
  const pendingChanges = useMemo(() => editingState?.pendingChanges ?? {}, [editingState?.pendingChanges])

  // Check if a cell has pending changes
  const getCellPendingValue = useCallback(
    (rowIndex: number, columnName: string) => {
      const key = `${rowIndex}:${columnName}`
      return pendingChanges[key]?.newValue
    },
    [pendingChanges]
  )

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    if (!result?.columns) return []

    const dataColumns = result.columns.map((col: Column, idx: number) => ({
      accessorKey: String(idx),
      header: col.name,
      size: 150,
      // Store column index for cell double-click handling
      meta: { columnIndex: idx, columnName: col.name, columnType: col.typeName },
      cell: (info: { getValue: () => unknown; row: { index: number } }) => {
        const rowIndex = info.row.index
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnIndex === idx
        const pendingValue = getCellPendingValue(rowIndex, col.name)
        const hasPending = pendingValue !== undefined

        // Get display value (pending or original)
        const displayValue = hasPending ? pendingValue : info.getValue()

        // In table mode, cells are editable
        if (isTableMode) {
          if (isEditing) {
            return (
              <EditingInput
                initialValue={displayValue}
                columnType={col.typeName}
                onCommit={(newValue) => commitCellEdit(rowIndex, col.name, newValue, col.typeName)}
                onCancel={cancelEditing}
              />
            )
          }

          return (
            <div className={`truncate ${hasPending ? 'bg-amber-500/20 border-l-2 border-amber-500 pl-2 -ml-1' : ''}`}>
              <CellValue value={displayValue} />
            </div>
          )
        }

        // Query mode - read only
        return <CellValue value={displayValue} />
      },
    }))

    // Add checkbox column only in table mode
    if (isTableMode) {
      const selectionColumn: ColumnDef<RowData> = {
        id: 'select',
        header: () => (
          <Checkbox
            checked={selectedRows.size === data.length && data.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedRows(new Set(data.map((_, i) => i)))
              } else {
                setSelectedRows(new Set())
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRows.has(row.index)}
            onCheckedChange={(checked) => {
              setSelectedRows((prev) => {
                const next = new Set(prev)
                if (checked) {
                  next.add(row.index)
                } else {
                  next.delete(row.index)
                }
                return next
              })
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
        enableResizing: false,
        enableSorting: false,
      }
      return [selectionColumn, ...dataColumns]
    }

    return dataColumns
  }, [
    result?.columns,
    isTableMode,
    selectedRows,
    data,
    editingCell,
    getCellPendingValue,
    commitCellEdit,
    cancelEditing,
  ])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableSorting: true,
  })

  const { rows } = table.getRowModel()

  // Force scrollbar repaint on container resize (fixes Tauri WebView bug)
  useLayoutEffect(() => {
    const element = parentRef.current
    if (!element) return

    const forceScrollbarRepaint = () => {
      const currentDisplay = element.style.display
      element.style.display = 'none'
      void element.offsetHeight // Force reflow
      element.style.display = currentDisplay || ''
    }

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(forceScrollbarRepaint)
    })

    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  })

  // Track last clicked row for shift-click range selection
  const lastClickedRowRef = useRef<number | null>(null)

  // Row click handler with multi-select support
  const handleRowClick = (rowIndex: number, e: React.MouseEvent) => {
    const isMetaKey = e.metaKey || e.ctrlKey
    const isShiftKey = e.shiftKey

    if (isMetaKey) {
      // Cmd/Ctrl+Click: Toggle individual row selection
      setSelectedRows((prev) => {
        const next = new Set(prev)
        if (next.has(rowIndex)) {
          next.delete(rowIndex)
        } else {
          next.add(rowIndex)
        }
        return next
      })
      lastClickedRowRef.current = rowIndex
    } else if (isShiftKey && lastClickedRowRef.current !== null) {
      // Shift+Click: Select range from last clicked to current
      const start = Math.min(lastClickedRowRef.current, rowIndex)
      const end = Math.max(lastClickedRowRef.current, rowIndex)
      setSelectedRows((prev) => {
        const next = new Set(prev)
        for (let i = start; i <= end; i++) {
          next.add(i)
        }
        return next
      })
    } else {
      // Normal click: Select only this row, clear others
      setSelectedRowIndex(rowIndex)
      setSelectedRows(new Set([rowIndex]))
      lastClickedRowRef.current = rowIndex
    }

    // Set focused cell in table mode
    if (isTableMode) {
      setFocusedCell({ row: rowIndex, col: 0 })
    }

    // Update sidebar row index
    if (activeWorkspace && activeTab) {
      setSidebarRowIndex(activeWorkspace.id, activeTab.id, rowIndex)
    }
  }

  // Handle insert row
  const handleInsertRow = async (values: Record<string, unknown>) => {
    if (!activeWorkspace || !activeTab?.tableName || !result) return

    const columnValues = Object.entries(values).map(([column, value]) => ({ column, value }))

    try {
      const insertResult = await insertRow(activeWorkspace.id, activeTab.tableName, columnValues)

      // Add new row to result
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

  // Handle delete selected rows
  const handleDeleteSelected = async () => {
    if (!activeWorkspace || !activeTab?.tableName || !result) return

    try {
      const pkColumns = await getPrimaryKey(activeWorkspace.id, activeTab.tableName)
      if (pkColumns.length === 0) {
        toast.error('Cannot delete: No primary key found')
        return
      }

      // Build primary key values for each selected row
      const rowsToDelete = Array.from(selectedRows).map((rowIndex) => {
        const row = result.rows[rowIndex]
        return pkColumns.map((pkCol) => {
          const colIndex = result.columns.findIndex((c) => c.name === pkCol)
          return { column: pkCol, value: row[colIndex] }
        })
      })

      await deleteRows(activeWorkspace.id, activeTab.tableName, rowsToDelete)

      // Remove deleted rows from result
      const remainingRows = result.rows.filter((_, idx) => !selectedRows.has(idx))
      setTabResult(activeWorkspace.id, activeTab.id, { ...result, rows: remainingRows })

      setSelectedRows(new Set())
      toast.success(`Deleted ${rowsToDelete.length} row(s)`)
    } catch (e) {
      toast.error(`Delete failed: ${e}`)
      throw e
    }
  }

  // Handle paste rows from clipboard
  const handlePasteRows = useCallback(async () => {
    if (!activeWorkspace || !activeTab?.tableName || !result?.columns) {
      toast.error('Cannot paste: No table selected')
      return
    }

    let csvData: string[][] | null = null
    try {
      csvData = await readClipboardAsCSV()
    } catch (err) {
      console.error('Failed to read clipboard:', err)
      toast.error('Failed to read clipboard')
      return
    }

    if (!csvData || csvData.length === 0) {
      toast.error('No valid data in clipboard')
      return
    }

    // Check if first row might be a header (matches column names)
    const firstRow = csvData[0]
    const columnNames = result.columns.map((c) => c.name.toLowerCase())
    const isHeader = firstRow.every((cell) => columnNames.includes(cell.toLowerCase()))

    const dataRows = isHeader ? csvData.slice(1) : csvData
    if (dataRows.length === 0) {
      toast.error('No data rows to paste')
      return
    }

    // Determine column mapping
    let columnMapping: number[]
    if (isHeader) {
      // Map by column names
      columnMapping = firstRow.map((name) => result.columns.findIndex((c) => c.name.toLowerCase() === name.toLowerCase()))
    } else {
      // Map by position (skip auto-increment/serial columns if possible)
      columnMapping = result.columns.map((_, idx) => idx)
    }

    let successCount = 0
    let errorCount = 0
    const newRows: (string | number | boolean | null)[][] = []

    for (const row of dataRows) {
      try {
        const columnValues: { column: string; value: unknown }[] = []

        for (let i = 0; i < row.length && i < result.columns.length; i++) {
          const colIdx = isHeader ? columnMapping[i] : i
          if (colIdx === -1 || colIdx >= result.columns.length) continue

          const col = result.columns[colIdx]
          const value = row[i]

          // Parse value based on column type
          const parsedValue = parseValueForInsert(value, col.typeName)
          columnValues.push({ column: col.name, value: parsedValue })
        }

        if (columnValues.length > 0) {
          const insertResult = await insertRow(activeWorkspace.id, activeTab.tableName, columnValues)
          if (insertResult.rows.length > 0) {
            newRows.push(insertResult.rows[0] as (string | number | boolean | null)[])
            successCount++
          }
        }
      } catch (e) {
        console.error('Failed to insert row:', e)
        errorCount++
      }
    }

    // Update local result with all new rows at once
    if (newRows.length > 0) {
      setTabResult(activeWorkspace.id, activeTab.id, {
        ...result,
        rows: [...result.rows, ...newRows],
      })
    }

    if (successCount > 0) {
      toast.success(`Pasted ${successCount} row(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`)
    } else if (errorCount > 0) {
      toast.error(`Failed to paste rows: ${errorCount} error(s)`)
    }
  }, [activeWorkspace, activeTab, result, setTabResult])

  // Scroll focused cell into view
  useEffect(() => {
    if (focusedCell && parentRef.current) {
      const rowEl = parentRef.current.querySelector(`[data-index="${focusedCell.row}"]`)
      rowEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedCell])

  // Clear focus state when switching away from table mode
  // Keep selectedRows for copy functionality in query mode
  useEffect(() => {
    if (!isTableMode) {
      setFocusedCell(null)
    }
  }, [isTableMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Copy rows (Cmd+C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !editingCell) {
        // Check if we have something to copy
        const hasMultiSelect = selectedRows.size > 0
        const hasSingleSelect = selectedRowIndex !== null

        if (!hasMultiSelect && !hasSingleSelect) return
        if (!result?.columns) return

        e.preventDefault()

        try {
          if (hasMultiSelect) {
            // Copy multiple selected rows (without header for easier paste back)
            const rowsData = Array.from(selectedRows)
              .sort((a, b) => a - b)
              .map((idx) => result.columns.map((_, colIdx) => rows[idx]?.original[String(colIdx)]))
            await copyRowsToClipboard(rowsData, result.columns)
            toast.success(`Copied ${selectedRows.size} row(s)`)
          } else if (hasSingleSelect) {
            // Copy single selected row
            const row = rows[selectedRowIndex]
            if (row) {
              const rowArray = result.columns.map((_, idx) => row.original[String(idx)])
              await copyRowToClipboard(rowArray)
              toast.success('Copied row')
            }
          }
        } catch (err) {
          console.error('Copy failed:', err)
          toast.error('Failed to copy to clipboard')
        }
      }

      // Paste rows (Cmd+V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !editingCell) {
        e.preventDefault()

        if (!isTableMode) {
          toast.error('Paste only works in table mode')
          return
        }

        await handlePasteRows()
      }

      // Save pending changes
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && Object.keys(pendingChanges).length > 0) {
        e.preventDefault()
        savePendingChanges()
      }

      // Cancel editing
      if (e.key === 'Escape' && editingCell) {
        cancelEditing()
      }

      // Select all (Cmd+A / Ctrl+A) - only in table mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && isTableMode && !editingCell) {
        e.preventDefault()

        if (rows.length === 0) return // Skip if empty grid

        // Select all visible rows
        const allIndices = new Set<number>()
        for (let i = 0; i < rows.length; i++) {
          allIndices.add(i)
        }
        setSelectedRows(allIndices)

        toast.success(`Selected ${rows.length} row(s)`)
      }

      // Arrow navigation (only in table mode, not editing)
      if (!editingCell && isTableMode && focusedCell) {
        // In table mode, we have checkbox column + data columns
        // focusedCell.col is the visual column index (0=checkbox, 1+=data)
        const dataCols = result?.columns?.length ?? 0
        const totalVisualCols = dataCols + 1 // +1 for checkbox column
        const totalRows = rows.length

        switch (e.key) {
          case 'ArrowUp':
            if (focusedCell.row > 0) {
              e.preventDefault()
              setFocusedCell({ row: focusedCell.row - 1, col: focusedCell.col })
            }
            break
          case 'ArrowDown':
            if (focusedCell.row < totalRows - 1) {
              e.preventDefault()
              setFocusedCell({ row: focusedCell.row + 1, col: focusedCell.col })
            }
            break
          case 'ArrowLeft':
            // Don't go left of first data column (skip checkbox at col 0)
            if (focusedCell.col > 1) {
              e.preventDefault()
              setFocusedCell({ row: focusedCell.row, col: focusedCell.col - 1 })
            }
            break
          case 'ArrowRight':
            if (focusedCell.col < totalVisualCols - 1) {
              e.preventDefault()
              setFocusedCell({ row: focusedCell.row, col: focusedCell.col + 1 })
            }
            break
        }
      }

      // Tab navigation (only in table mode, not editing)
      if (e.key === 'Tab' && isTableMode && focusedCell && !editingCell) {
        e.preventDefault()

        const totalCols = result?.columns?.length ?? 0
        const totalRows = rows.length

        // Skip the checkbox column (index 0) in table mode
        const firstDataCol = 1 // First data column after checkbox
        const lastDataCol = totalCols // Columns include checkbox

        if (e.shiftKey) {
          // Shift+Tab: move to prev cell
          if (focusedCell.col > firstDataCol) {
            setFocusedCell({ row: focusedCell.row, col: focusedCell.col - 1 })
          } else if (focusedCell.row > 0) {
            setFocusedCell({ row: focusedCell.row - 1, col: lastDataCol - 1 })
          }
        } else {
          // Tab: move to next cell
          if (focusedCell.col < lastDataCol - 1) {
            setFocusedCell({ row: focusedCell.row, col: focusedCell.col + 1 })
          } else if (focusedCell.row < totalRows - 1) {
            setFocusedCell({ row: focusedCell.row + 1, col: firstDataCol })
          }
        }
      }

      // Enter to start editing (only in table mode, not already editing)
      if (e.key === 'Enter' && isTableMode && focusedCell && !editingCell) {
        e.preventDefault()
        // Start editing the focused cell (adjust col index for checkbox column)
        const dataColIndex = focusedCell.col - 1 // Subtract 1 for checkbox column
        if (dataColIndex >= 0) {
          startEditing(focusedCell.row, dataColIndex)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedRowIndex,
    selectedRows,
    rows,
    result?.columns,
    result,
    editingCell,
    pendingChanges,
    savePendingChanges,
    cancelEditing,
    isTableMode,
    handlePasteRows,
    focusedCell,
    startEditing,
  ])

  if (!activeTab) {
    return null
  }

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
    <div className='flex flex-1 flex-col overflow-hidden bg-background'>
      <GridToolbar
        rowCount={rows.length}
        executionTime={result.executionTimeMs}
        columns={result.columns}
        rows={result.rows}
        onApplyFilters={applyFilters}
        onRefresh={applyFilters}
      />

      {/* Editing toolbar - shows when there are pending changes */}
      <EditingToolbar onSave={savePendingChanges} onDiscard={discardPendingChanges} />

      {/* Row manager - Add/Delete buttons in table mode */}
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

      {/* Main content area */}
      <div className='flex-1 flex flex-col' style={{ minHeight: 0 }}>
        <div ref={parentRef} className='flex-1 overflow-auto scrollbar-visible' style={{ position: 'relative' }}>
          <div style={{ width: totalWidth, minWidth: '100%' }}>
            {/* Header */}
            <div className='sticky top-0 z-10 bg-card border-b border-border'>
              {headerGroups.map((headerGroup) => (
                <div key={headerGroup.id} className='flex'>
                  {headerGroup.headers.map((header) => {
                    const sortDirection = header.column.getIsSorted()
                    return (
                      <div
                        key={header.id}
                        className='relative px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border last:border-r-0 flex-shrink-0 select-none'
                        style={{ width: header.getSize(), minWidth: header.getSize() }}
                      >
                        <div
                          className='flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors'
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDirection && (
                            <span className='ml-1'>
                              {sortDirection === 'asc' ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />}
                            </span>
                          )}
                        </div>
                        {/* Resize Handle */}
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-primary transition-colors ${
                            header.column.getIsResizing() ? 'bg-primary' : ''
                          }`}
                          style={{
                            transform: header.column.getIsResizing()
                              ? `translateX(${table.getState().columnSizingInfo.deltaOffset ?? 0}px)`
                              : '',
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Virtual Rows */}
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                const isRowSelected = selectedRows.has(virtualRow.index) || selectedRowIndex === virtualRow.index
                const isEvenRow = virtualRow.index % 2 === 0
                return (
                  <div
                    key={row.id}
                    data-index={virtualRow.index}
                    className={`flex border-b border-border hover:bg-accent transition-colors absolute left-0 cursor-pointer ${
                      isRowSelected ? 'bg-accent/50' : isEvenRow ? 'bg-background' : 'bg-muted'
                    }`}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: totalWidth,
                    }}
                    onClick={(e) => handleRowClick(virtualRow.index, e)}
                  >
                    {row.getVisibleCells().map((cell, colIndex) => {
                      const meta = cell.column.columnDef.meta as
                        | { columnIndex: number; columnName: string; columnType: string }
                        | undefined
                      const isFocused = focusedCell?.row === virtualRow.index && focusedCell?.col === colIndex
                      return (
                        <div
                          key={cell.id}
                          className={`px-3 py-1.5 text-foreground font-mono text-xs truncate flex items-center border-r border-border last:border-r-0 flex-shrink-0 ${
                            isTableMode && meta ? 'cursor-text' : ''
                          } ${isFocused ? 'ring-2 ring-primary ring-inset' : ''}`}
                          style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                          onDoubleClick={(e) => {
                            // In table mode, double-click cell to edit
                            if (isTableMode && meta) {
                              e.stopPropagation()
                              startEditing(virtualRow.index, meta.columnIndex)
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              cellValue: cell.getValue() as string | number | boolean | null,
                              rowData: row.original,
                            })
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

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

// Cell value display component
function CellValue({ value }: { value: unknown }) {
  if (value === null) return <span className='text-muted-foreground/50 italic'>NULL</span>
  if (typeof value === 'boolean') return <span className='text-amber-400'>{String(value)}</span>
  if (typeof value === 'number') return <span className='text-emerald-400'>{value}</span>
  const str = formatValue(value)
  return <span title={str}>{str}</span>
}

// Inline editing input component
function EditingInput({
  initialValue,
  columnType,
  onCommit,
  onCancel,
}: {
  initialValue: unknown
  columnType: string
  onCommit: (value: unknown) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(formatValue(initialValue))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onCommit(parseInputValue(value, columnType))
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const handleBlur = () => {
    onCommit(parseInputValue(value, columnType))
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className='w-full h-full px-2 bg-background border border-primary outline-none text-xs font-mono'
      onClick={(e) => e.stopPropagation()}
    />
  )
}

// Parse input value based on column type
function parseInputValue(value: string, columnType: string): unknown {
  const lowerType = columnType.toLowerCase()

  if (value === '' || value.toLowerCase() === 'null') return null

  if (lowerType.includes('bool')) {
    return value.toLowerCase() === 'true' || value === '1'
  }

  if (lowerType.includes('int') || lowerType === 'serial' || lowerType === 'bigserial') {
    const num = parseInt(value, 10)
    return isNaN(num) ? value : num
  }

  if (lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('numeric') || lowerType.includes('decimal')) {
    const num = parseFloat(value)
    return isNaN(num) ? value : num
  }

  return value
}

// Parse CSV value for INSERT (handles empty strings, nulls, type conversion)
function parseValueForInsert(value: string, columnType: string): unknown {
  const trimmed = value.trim()
  const lowerType = columnType.toLowerCase()

  // Handle empty/null values
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === '\\n') {
    return null
  }

  // Boolean
  if (lowerType.includes('bool')) {
    const lower = trimmed.toLowerCase()
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 't'
  }

  // Integer types
  if (lowerType.includes('int') || lowerType === 'serial' || lowerType === 'bigserial') {
    const num = parseInt(trimmed, 10)
    return isNaN(num) ? null : num
  }

  // Float/decimal types
  if (lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('numeric') || lowerType.includes('decimal') || lowerType.includes('real')) {
    const num = parseFloat(trimmed)
    return isNaN(num) ? null : num
  }

  // JSON/JSONB
  if (lowerType.includes('json')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed
    }
  }

  // Default: return as string
  return trimmed
}
