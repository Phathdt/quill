import { useCallback, useRef, useState } from 'react'

interface UseDataGridSelectionReturn {
  // Single row selection (for sidebar)
  selectedRowIndex: number | null
  setSelectedRowIndex: (index: number | null) => void

  // Multi-row selection (for bulk operations)
  selectedRows: Set<number>
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>

  // Cell focus (for keyboard navigation)
  focusedCell: { row: number; col: number } | null
  setFocusedCell: (cell: { row: number; col: number } | null) => void

  // Row click handler with multi-select support
  handleRowClick: (
    rowIndex: number,
    e: React.MouseEvent,
    options?: {
      isTableMode: boolean
      onSidebarUpdate?: (rowIndex: number) => void
    }
  ) => void

  // Clear all selection
  clearSelection: () => void
}

/**
 * Hook for managing DataGrid selection state
 * Supports: single selection, multi-selection (Cmd/Ctrl), range selection (Shift), cell focus
 */
export function useDataGridSelection(): UseDataGridSelectionReturn {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)

  // Track last clicked row for shift-click range selection
  const lastClickedRowRef = useRef<number | null>(null)

  const handleRowClick = useCallback(
    (
      rowIndex: number,
      e: React.MouseEvent,
      options?: {
        isTableMode: boolean
        onSidebarUpdate?: (rowIndex: number) => void
      }
    ) => {
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
        // Normal click: Select only this row
        setSelectedRowIndex(rowIndex)
        setSelectedRows(new Set([rowIndex]))
        lastClickedRowRef.current = rowIndex
      }

      // Set focused cell in table mode
      if (options?.isTableMode) {
        setFocusedCell({ row: rowIndex, col: 0 })
      }

      // Update sidebar row index
      options?.onSidebarUpdate?.(rowIndex)
    },
    []
  )

  const clearSelection = useCallback(() => {
    setSelectedRowIndex(null)
    setSelectedRows(new Set())
    setFocusedCell(null)
    lastClickedRowRef.current = null
  }, [])

  return {
    selectedRowIndex,
    setSelectedRowIndex,
    selectedRows,
    setSelectedRows,
    focusedCell,
    setFocusedCell,
    handleRowClick,
    clearSelection,
  }
}
