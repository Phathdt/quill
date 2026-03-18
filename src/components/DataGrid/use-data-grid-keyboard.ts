import { useCallback, useEffect, useRef } from 'react'

import type { Row } from '@tanstack/react-table'

import { copyRowsToClipboard, copyRowToClipboard, readClipboardAsCSV } from '@/lib/clipboard'
import { toast } from '@/lib/toast'
import type { Column } from '@/types/database'

import { parseValueForInsert } from './parse-value-for-insert'

type RowData = Record<string, string | number | boolean | null>

interface UseDataGridKeyboardProps {
  // Selection state
  selectedRowIndex: number | null
  setSelectedRowIndex: (index: number | null) => void
  selectedRows: Set<number>
  setSelectedRows: (rows: Set<number>) => void

  // Focus state
  focusedCell: { row: number; col: number } | null
  setFocusedCell: (cell: { row: number; col: number } | null) => void

  // Editing state
  editingCell: { rowIndex: number; columnIndex: number } | null
  startEditing: (rowIndex: number, columnIndex: number) => void
  cancelEditing: () => void

  // Pending changes
  pendingChanges: Record<string, unknown>
  pendingNewRows: { tempId: string; values: Record<string, unknown> }[]
  pendingDeletes: Set<number>
  savePendingChanges: () => void

  // Data
  rows: Row<RowData>[]
  columns: Column[] | undefined
  result: { rows: unknown[][]; columns: Column[] } | null

  // Mode
  isTableMode: boolean
  activeView?: 'data' | 'structure'

  // Callback when row selection changes via keyboard (e.g. for sidebar sync)
  onRowNavigate?: (rowIndex: number) => void

  // Actions
  addPendingNewRows: (
    workspaceId: string,
    tabId: string,
    rows: { tempId: string; values: Record<string, unknown> }[]
  ) => void
  addPendingDeletes: (workspaceId: string, tabId: string, rowIndices: number[]) => void

  // Context
  activeWorkspace: { id: string } | null
  activeTab: { id: string } | null
}

/**
 * Hook for DataGrid keyboard shortcuts
 * Handles: Copy (Cmd+C), Paste (Cmd+V), Save (Cmd+S), Delete, Select All, Arrow navigation, Tab, Enter
 */
export function useDataGridKeyboard({
  selectedRowIndex,
  setSelectedRowIndex,
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
  columns,
  result,
  isTableMode,
  activeView = 'data',
  addPendingNewRows,
  addPendingDeletes,
  onRowNavigate,
  activeWorkspace,
  activeTab,
}: UseDataGridKeyboardProps) {
  // Anchor row for Shift+Arrow range selection
  const selectionAnchorRef = useRef<number | null>(null)

  // Debounced sidebar navigation — fires 120ms after last arrow key
  const navigateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedRowNavigate = useCallback(
    (rowIndex: number) => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current)
      navigateTimerRef.current = setTimeout(() => {
        onRowNavigate?.(rowIndex)
      }, 120)
    },
    [onRowNavigate]
  )

  // Handle paste rows from clipboard
  const handlePasteRows = useCallback(async () => {
    if (!activeWorkspace || !activeTab || !result?.columns) {
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

    // Check if first row might be a header
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
      columnMapping = firstRow.map((name) =>
        result.columns.findIndex((c) => c.name.toLowerCase() === name.toLowerCase())
      )
    } else {
      columnMapping = result.columns.map((_, idx) => idx)
    }

    // Build pending new rows
    const pendingRows: { tempId: string; values: Record<string, unknown> }[] = []

    for (const row of dataRows) {
      const values: Record<string, unknown> = {}

      for (let i = 0; i < row.length && i < result.columns.length; i++) {
        const colIdx = isHeader ? columnMapping[i] : i
        if (colIdx === -1 || colIdx >= result.columns.length) continue

        const col = result.columns[colIdx]
        const value = row[i]
        values[col.name] = parseValueForInsert(value, col.typeName)
      }

      if (Object.keys(values).length > 0) {
        pendingRows.push({
          tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          values,
        })
      }
    }

    if (pendingRows.length > 0) {
      addPendingNewRows(activeWorkspace.id, activeTab.id, pendingRows)
      toast.success(`${pendingRows.length} row(s) ready to save (Cmd+S)`)
    }
  }, [activeWorkspace, activeTab, result, addPendingNewRows])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Skip if target is an input, textarea, or contenteditable (like Monaco editor)
      const target = e.target as HTMLElement
      const isEditorOrInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.monaco-editor') !== null

      // Copy rows (Cmd+C) - only handle for data grid, let editor handle its own copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !editingCell) {
        // Skip if typing in editor/input - let native copy work
        if (isEditorOrInput) return

        const hasMultiSelect = selectedRows.size > 0
        const hasSingleSelect = selectedRowIndex !== null

        if (!hasMultiSelect && !hasSingleSelect) return
        if (!columns) return

        e.preventDefault()

        try {
          if (hasMultiSelect) {
            const rowsData = Array.from(selectedRows)
              .sort((a, b) => a - b)
              .map((idx) => columns.map((_, colIdx) => rows[idx]?.original[String(colIdx)]))
            await copyRowsToClipboard(rowsData, columns)
            toast.success(`Copied ${selectedRows.size} row(s)`)
          } else if (hasSingleSelect) {
            const row = rows[selectedRowIndex]
            if (row) {
              const rowArray = columns.map((_, idx) => row.original[String(idx)])
              await copyRowToClipboard(rowArray)
              toast.success('Copied row')
            }
          }
        } catch (err) {
          console.error('Copy failed:', err)
          toast.error('Failed to copy to clipboard')
        }
      }

      // Paste rows (Cmd+V) - only handle in table mode, let editor handle its own paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !editingCell) {
        // Skip if typing in editor/input - let native paste work
        if (isEditorOrInput) return

        if (!isTableMode) {
          // Not in table mode and not in editor - don't intercept
          return
        }
        e.preventDefault()
        await handlePasteRows()
      }

      // Save pending changes (Cmd+S)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        const hasEdits = Object.keys(pendingChanges).length > 0
        const hasNewRows = pendingNewRows.length > 0
        const hasDeletes = pendingDeletes.size > 0
        if (hasEdits || hasNewRows || hasDeletes) {
          e.preventDefault()
          savePendingChanges()
        }
      }

      // Mark selected rows for deletion (Cmd+X, Delete, Backspace)
      // Skip if focus is inside an input/textarea/select
      const focusedTag = (document.activeElement as HTMLElement)?.tagName
      const isFocusedInInput =
        focusedTag === 'INPUT' ||
        focusedTag === 'TEXTAREA' ||
        focusedTag === 'SELECT' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      if (isTableMode && !editingCell && !isFocusedInInput) {
        const isDeleteKey = e.key === 'Delete' || e.key === 'Backspace' || ((e.metaKey || e.ctrlKey) && e.key === 'x')

        if (isDeleteKey) {
          // Always prevent default to stop WebKit from navigating back on Backspace
          e.preventDefault()

          // Only mark rows for deletion when in data view
          if (activeView === 'data') {
            const rowsToMark =
              selectedRows.size > 0 ? Array.from(selectedRows) : selectedRowIndex !== null ? [selectedRowIndex] : []

            if (activeWorkspace && activeTab && rowsToMark.length > 0) {
              const existingRowCount = result?.rows?.length ?? 0
              const rowsToDelete = rowsToMark.filter((idx) => idx < existingRowCount && !pendingDeletes.has(idx))
              if (rowsToDelete.length > 0) {
                addPendingDeletes(activeWorkspace.id, activeTab.id, rowsToDelete)
                setSelectedRows(new Set())
              }
            }
          }
        }
      }

      // Cancel editing
      if (e.key === 'Escape' && editingCell) {
        cancelEditing()
      }

      // Select all (Cmd+A) - only handle in data grid, let editor handle its own select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && isTableMode && !editingCell) {
        // Skip if typing in editor/input - let native select all work
        if (isEditorOrInput) return

        e.preventDefault()
        if (rows.length === 0) return
        const allIndices = new Set<number>()
        for (let i = 0; i < rows.length; i++) {
          allIndices.add(i)
        }
        setSelectedRows(allIndices)
        toast.success(`Selected ${rows.length} row(s)`)
      }

      // Arrow navigation
      if (!editingCell && isTableMode && focusedCell) {
        const totalCols = columns?.length ?? 0
        const totalRows = rows.length

        switch (e.key) {
          case 'ArrowUp':
            if (focusedCell.row > 0) {
              e.preventDefault()
              const newRow = focusedCell.row - 1
              setFocusedCell({ row: newRow, col: focusedCell.col })
              if (e.shiftKey) {
                // Extend range from anchor to newRow
                if (selectionAnchorRef.current === null) selectionAnchorRef.current = focusedCell.row
                const anchor = selectionAnchorRef.current
                const range = new Set<number>()
                for (let i = Math.min(anchor, newRow); i <= Math.max(anchor, newRow); i++) range.add(i)
                setSelectedRows(range)
              } else {
                selectionAnchorRef.current = newRow
                setSelectedRowIndex(newRow)
                setSelectedRows(new Set([newRow]))
                debouncedRowNavigate(newRow)
              }
            }
            break
          case 'ArrowDown':
            if (focusedCell.row < totalRows - 1) {
              e.preventDefault()
              const newRow = focusedCell.row + 1
              setFocusedCell({ row: newRow, col: focusedCell.col })
              if (e.shiftKey) {
                // Extend range from anchor to newRow
                if (selectionAnchorRef.current === null) selectionAnchorRef.current = focusedCell.row
                const anchor = selectionAnchorRef.current
                const range = new Set<number>()
                for (let i = Math.min(anchor, newRow); i <= Math.max(anchor, newRow); i++) range.add(i)
                setSelectedRows(range)
              } else {
                selectionAnchorRef.current = newRow
                setSelectedRowIndex(newRow)
                setSelectedRows(new Set([newRow]))
                debouncedRowNavigate(newRow)
              }
            }
            break
          case 'ArrowLeft':
            if (focusedCell.col > 0) {
              e.preventDefault()
              setFocusedCell({ row: focusedCell.row, col: focusedCell.col - 1 })
            }
            break
          case 'ArrowRight':
            if (focusedCell.col < totalCols - 1) {
              e.preventDefault()
              setFocusedCell({ row: focusedCell.row, col: focusedCell.col + 1 })
            }
            break
        }
      }

      // Tab navigation
      if (e.key === 'Tab' && isTableMode && focusedCell && !editingCell) {
        e.preventDefault()
        const totalCols = columns?.length ?? 0
        const totalRows = rows.length

        if (e.shiftKey) {
          if (focusedCell.col > 0) {
            setFocusedCell({ row: focusedCell.row, col: focusedCell.col - 1 })
          } else if (focusedCell.row > 0) {
            setFocusedCell({ row: focusedCell.row - 1, col: totalCols - 1 })
          }
        } else {
          if (focusedCell.col < totalCols - 1) {
            setFocusedCell({ row: focusedCell.row, col: focusedCell.col + 1 })
          } else if (focusedCell.row < totalRows - 1) {
            setFocusedCell({ row: focusedCell.row + 1, col: 0 })
          }
        }
      }

      // Enter to start editing
      if (e.key === 'Enter' && isTableMode && focusedCell && !editingCell) {
        e.preventDefault()
        startEditing(focusedCell.row, focusedCell.col)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedRowIndex,
    setSelectedRowIndex,
    selectedRows,
    setSelectedRows,
    rows,
    columns,
    result,
    editingCell,
    pendingChanges,
    pendingNewRows,
    pendingDeletes,
    savePendingChanges,
    cancelEditing,
    isTableMode,
    handlePasteRows,
    focusedCell,
    setFocusedCell,
    startEditing,
    activeWorkspace,
    activeTab,
    addPendingDeletes,
    debouncedRowNavigate,
  ])
}
