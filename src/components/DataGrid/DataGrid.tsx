/* eslint-disable react-hooks/incompatible-library */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import { useTableFilter } from '@/hooks/useTableFilter'
import { copyRowToClipboard } from '@/lib/clipboard'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { Column } from '@/types/database'
import { AlertCircle, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react'

import { ContextMenu } from './ContextMenu'
import { GridToolbar } from './GridToolbar'

type RowData = Record<string, string | number | boolean | null>

export function DataGrid() {
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const parentRef = useRef<HTMLDivElement>(null)
  const { applyFilters } = useTableFilter()

  const result = activeTab?.result ?? null
  const error = activeTab?.error ?? null
  const loading = activeTab?.loading ?? false

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Row selection state
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    cellValue: string | number | boolean | null
    rowData: RowData
  } | null>(null)

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    if (!result?.columns) return []
    return result.columns.map((col: Column, idx: number) => ({
      accessorKey: String(idx),
      header: col.name,
      size: 150,
      cell: (info: { getValue: () => unknown }) => {
        const val = info.getValue()
        if (val === null) return <span className='text-muted-foreground/50 italic'>NULL</span>
        if (typeof val === 'boolean') return <span className='text-amber-400'>{String(val)}</span>
        if (typeof val === 'number') return <span className='text-emerald-400'>{val}</span>
        const str = String(val)
        return <span title={str}>{str}</span>
      },
    }))
  }, [result?.columns])

  const data = useMemo(() => {
    if (!result?.rows) return []
    return result.rows.map((row: unknown[]) =>
      Object.fromEntries(row.map((val: unknown, idx: number) => [String(idx), val as string | number | boolean | null]))
    )
  }, [result?.rows])

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

  // Keyboard shortcuts for copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedRowIndex !== null) {
        const row = rows[selectedRowIndex]
        if (row && result?.columns) {
          const rowArray = result.columns.map((_, idx) => row.original[String(idx)])
          copyRowToClipboard(rowArray)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedRowIndex, rows, result?.columns])

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

  // Calculate total table width for horizontal scroll
  const totalWidth = table.getTotalSize()

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-background'>
      <GridToolbar
        rowCount={rows.length}
        executionTime={result.executionTimeMs}
        columns={result.columns}
        rows={result.rows}
        onApplyFilters={applyFilters}
      />

      {/* Main content area - separate flex container from scroll container */}
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
                              {sortDirection === 'asc' ? (
                                <ChevronUp className='h-3 w-3' />
                              ) : (
                                <ChevronDown className='h-3 w-3' />
                              )}
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
                const isSelected = selectedRowIndex === virtualRow.index
                return (
                  <div
                    key={row.id}
                    data-index={virtualRow.index}
                    className={`flex border-b border-border hover:bg-accent transition-colors absolute left-0 cursor-pointer ${
                      isSelected ? 'bg-accent/50' : ''
                    }`}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: totalWidth,
                    }}
                    onClick={() => setSelectedRowIndex(virtualRow.index)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        className='px-3 py-1.5 text-foreground font-mono text-xs truncate flex items-center border-r border-border last:border-r-0 flex-shrink-0'
                        style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
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
                    ))}
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
    </div>
  )
}
