import { flexRender, type HeaderGroup, type Table } from '@tanstack/react-table'

import { ChevronDown, ChevronUp } from 'lucide-react'

type RowData = Record<string, string | number | boolean | null>

interface DataGridHeaderProps {
  headerGroups: HeaderGroup<RowData>[]
  table: Table<RowData>
}

/**
 * DataGrid header component with sorting and column resizing
 * Uses sticky positioning for scroll behavior
 */
export function DataGridHeader({ headerGroups, table }: DataGridHeaderProps) {
  return (
    <div className='sticky top-0 z-10 bg-card border-b border-border'>
      {headerGroups.map((headerGroup) => (
        <div key={headerGroup.id} className='flex'>
          {headerGroup.headers.map((header) => {
            const sortDirection = header.column.getIsSorted()
            return (
              <div
                key={header.id}
                className='relative px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border last:border-r-0 flex-shrink-0 select-none bg-muted/30'
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
  )
}
