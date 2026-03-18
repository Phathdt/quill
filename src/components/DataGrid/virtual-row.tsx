import { useRef } from 'react'

import { flexRender, type Row } from '@tanstack/react-table'
import type { VirtualItem } from '@tanstack/react-virtual'

import { CellValue } from './cell-value'
import { EditingInput } from './editing-input'

type RowData = Record<string, string | number | boolean | null>

interface VirtualRowProps {
  row: Row<RowData>
  virtualRow: VirtualItem
  totalWidth: number

  // Selection state
  isSelected: boolean
  isPendingNewRow: boolean
  isPendingDelete: boolean

  // Cell focus
  focusedCell: { row: number; col: number } | null
  setFocusedCell: (cell: { row: number; col: number } | null) => void

  // Editing state
  editingCell: { rowIndex: number; columnIndex: number } | null
  isTableMode: boolean

  // Handlers
  onRowClick: (rowIndex: number, e: React.MouseEvent) => void
  onCellDoubleClick: (rowIndex: number, columnIndex: number) => void
  onContextMenu: (e: React.MouseEvent, cellValue: unknown, rowData: RowData) => void
  getCellPendingValue: (rowIndex: number, columnName: string) => unknown
  onCommitEdit: (rowIndex: number, columnName: string, value: unknown, columnType: string) => void
  onCancelEdit: () => void
}

/**
 * Virtualized row component for DataGrid
 * Handles cell rendering, editing, and selection
 */
export function VirtualRow({
  row,
  virtualRow,
  totalWidth,
  isSelected,
  isPendingNewRow,
  isPendingDelete,
  focusedCell,
  setFocusedCell,
  editingCell,
  isTableMode,
  onRowClick,
  onCellDoubleClick,
  onContextMenu,
  getCellPendingValue,
  onCommitEdit,
  onCancelEdit,
}: VirtualRowProps) {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isEvenRow = virtualRow.index % 2 === 0

  // Determine row background
  const getRowClassName = () => {
    const base = 'flex border-b border-border hover:bg-accent/50 transition-colors absolute left-0 cursor-pointer'

    if (isPendingDelete) {
      return `${base} bg-red-500/20 border-l-2 border-l-red-500`
    }
    if (isPendingNewRow) {
      return `${base} bg-emerald-500/10 border-l-2 border-l-emerald-500`
    }
    if (isSelected) {
      return `${base} bg-primary/10`
    }
    // Zebra striping: even rows white/dark, odd rows light gray
    return `${base} ${isEvenRow ? 'bg-card' : 'bg-muted/50'}`
  }

  return (
    <div
      data-index={virtualRow.index}
      className={getRowClassName()}
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        width: totalWidth,
      }}
      onClick={(e) => onRowClick(virtualRow.index, e)}
    >
      {row.getVisibleCells().map((cell, colIndex) => {
        const meta = cell.column.columnDef.meta as
          | { columnIndex: number; columnName: string; columnType: string }
          | undefined

        const isFocused = focusedCell?.row === virtualRow.index && focusedCell?.col === colIndex
        const isEditing =
          meta && editingCell?.rowIndex === virtualRow.index && editingCell?.columnIndex === meta.columnIndex

        // Get display value (pending or original)
        const cellValue = cell.getValue()
        const pendingValue = meta ? getCellPendingValue(virtualRow.index, meta.columnName) : undefined
        const displayValue = pendingValue !== undefined ? pendingValue : cellValue
        const hasPending = pendingValue !== undefined

        return (
          <div
            key={cell.id}
            className={`relative px-3 py-1.5 text-foreground font-mono text-xs truncate flex items-center border-r border-border first:border-l shrink-0 ${
              isTableMode && meta ? 'cursor-text' : ''
            } ${isFocused ? 'ring-2 ring-primary ring-inset rounded-sm' : ''} ${hasPending ? 'bg-amber-500/20' : ''}`}
            style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
            onClick={(e) => {
              if (isTableMode && meta) {
                e.stopPropagation()
                setFocusedCell({ row: virtualRow.index, col: colIndex })

                // Handle multi-select with Cmd/Ctrl or Shift
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                  // Let the row click handler deal with multi-select
                  onRowClick(virtualRow.index, e)
                } else {
                  // Normal click - delayed single selection (for double-click detection)
                  if (clickTimeoutRef.current) {
                    clearTimeout(clickTimeoutRef.current)
                  }
                  clickTimeoutRef.current = setTimeout(() => {
                    onRowClick(virtualRow.index, e)
                  }, 200)
                }
              }
            }}
            onDoubleClick={(e) => {
              if (isTableMode && meta) {
                e.stopPropagation()
                if (clickTimeoutRef.current) {
                  clearTimeout(clickTimeoutRef.current)
                  clickTimeoutRef.current = null
                }
                onCellDoubleClick(virtualRow.index, meta.columnIndex)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              onContextMenu(e, cell.getValue(), row.original)
            }}
          >
            {isEditing && meta ? (
              <EditingInput
                initialValue={displayValue}
                columnType={meta.columnType}
                onCommit={(newValue) => onCommitEdit(virtualRow.index, meta.columnName, newValue, meta.columnType)}
                onCancel={onCancelEdit}
              />
            ) : (
              <>
                {meta ? (
                  <div className={`truncate ${hasPending ? 'border-l-2 border-amber-500 pl-2 -ml-1' : ''}`}>
                    <CellValue value={displayValue} />
                  </div>
                ) : (
                  flexRender(cell.column.columnDef.cell, cell.getContext())
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
