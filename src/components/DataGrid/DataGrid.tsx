import { useMemo, useRef } from 'react'

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import { useQueryStore } from '@/stores/queryStore'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'

import { GridToolbar } from './GridToolbar'

type RowData = Record<string, string | number | boolean | null>

export function DataGrid() {
  const result = useQueryStore((s) => s.result)
  const error = useQueryStore((s) => s.error)
  const loading = useQueryStore((s) => s.loading)
  const parentRef = useRef<HTMLDivElement>(null)

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    if (!result?.columns) return []
    return result.columns.map((col, idx) => ({
      accessorKey: String(idx),
      header: col.name,
      size: 150,
      cell: (info) => {
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
    return result.rows.map((row) => Object.fromEntries(row.map((val, idx) => [String(idx), val])))
  }, [result?.rows])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  })

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

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-background'>
      <GridToolbar rowCount={result.rows.length} executionTime={result.executionTimeMs} />
      <div ref={parentRef} className='flex-1 overflow-auto'>
        {/* Sticky Header */}
        <div className='sticky top-0 z-10 bg-card border-b border-border'>
          {headerGroups.map((headerGroup) => (
            <div key={headerGroup.id} className='flex'>
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  className='px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border last:border-r-0 flex-shrink-0'
                  style={{ width: header.getSize(), minWidth: header.getSize() }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
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
            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                className='flex border-b border-border hover:bg-accent transition-colors absolute left-0 w-full'
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className='px-3 py-1.5 text-foreground font-mono text-xs truncate flex items-center border-r border-border last:border-r-0 flex-shrink-0'
                    style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
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
  )
}
