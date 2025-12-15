import { useCallback, useEffect } from 'react'

import { getPrimaryKey, updateRow } from '@/lib/tauri'
import { toast } from '@/lib/toast'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { CellEdit } from '@/types/editing'

export function useInlineEditing() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setPrimaryKeyColumns = useWorkspaceManagerStore((s) => s.setPrimaryKeyColumns)
  const addPendingChange = useWorkspaceManagerStore((s) => s.addPendingChange)
  const clearPendingChanges = useWorkspaceManagerStore((s) => s.clearPendingChanges)
  const setEditingCell = useWorkspaceManagerStore((s) => s.setEditingCell)
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)

  const editingState = activeTab?.editingState
  const isTableMode = activeTab?.type === 'table'

  // Extract IDs for stable dependencies
  const workspaceId = activeWorkspace?.id
  const tabId = activeTab?.id
  const tableName = activeTab?.tableName

  // Fetch primary keys on table mount
  useEffect(() => {
    if (!workspaceId || !tabId || !isTableMode || !tableName) return

    const fetchPrimaryKeys = async () => {
      try {
        const pk = await getPrimaryKey(workspaceId, tableName)
        setPrimaryKeyColumns(workspaceId, tabId, pk)
      } catch (error) {
        console.error('Failed to fetch primary keys:', error)
      }
    }

    fetchPrimaryKeys()
  }, [workspaceId, tabId, tableName, isTableMode, setPrimaryKeyColumns])

  const startEditing = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!workspaceId || !tabId) return
      setEditingCell(workspaceId, tabId, { rowIndex, columnIndex })
    },
    [workspaceId, tabId, setEditingCell]
  )

  const tabResult = activeTab?.result

  const commitCellEdit = useCallback(
    (rowIndex: number, columnName: string, newValue: unknown, columnType: string) => {
      if (!workspaceId || !tabId || !tabResult) return

      const originalValue = tabResult.rows[rowIndex]?.[tabResult.columns.findIndex((c) => c.name === columnName)]

      if (originalValue === newValue) {
        setEditingCell(workspaceId, tabId, null)
        return
      }

      const change: CellEdit = {
        rowIndex,
        columnName,
        originalValue,
        newValue,
        columnType,
      }

      addPendingChange(workspaceId, tabId, change)
      setEditingCell(workspaceId, tabId, null)
    },
    [workspaceId, tabId, tabResult, addPendingChange, setEditingCell]
  )

  const cancelEditing = useCallback(() => {
    if (!workspaceId || !tabId) return
    setEditingCell(workspaceId, tabId, null)
  }, [workspaceId, tabId, setEditingCell])

  const savePendingChanges = useCallback(async () => {
    if (!workspaceId || !tabId || !tabResult || !tableName) return

    const pendingChanges = editingState?.pendingChanges ?? {}
    const primaryKeys = editingState?.primaryKeyColumns ?? []

    if (Object.keys(pendingChanges).length === 0) return

    if (primaryKeys.length === 0) {
      toast.error('Cannot edit: No primary key found')
      return
    }

    try {
      // Group changes by row
      const changesByRow: Record<number, CellEdit[]> = {}
      for (const change of Object.values(pendingChanges)) {
        if (!changesByRow[change.rowIndex]) {
          changesByRow[change.rowIndex] = []
        }
        changesByRow[change.rowIndex].push(change)
      }

      // Update each row
      for (const [rowIndexStr, changes] of Object.entries(changesByRow)) {
        const rowIndex = parseInt(rowIndexStr, 10)
        const row = tabResult.rows[rowIndex]

        // Build primary key values
        const pkValues = primaryKeys.map((pkCol) => {
          const colIndex = tabResult.columns.findIndex((c) => c.name === pkCol)
          return {
            column: pkCol,
            value: row[colIndex],
          }
        })

        // Build updates
        const updates = changes.map((change) => ({
          column: change.columnName,
          value: change.newValue,
        }))

        await updateRow(workspaceId, tableName, pkValues, updates)

        // Update local result with new values
        const newRows = [...tabResult.rows]
        for (const change of changes) {
          const colIndex = tabResult.columns.findIndex((c) => c.name === change.columnName)
          newRows[rowIndex][colIndex] = change.newValue as string | number | boolean | null
        }

        setTabResult(workspaceId, tabId, {
          ...tabResult,
          rows: newRows,
        })
      }

      clearPendingChanges(workspaceId, tabId)
      toast.success(`Updated ${Object.keys(changesByRow).length} row(s)`)
    } catch (error) {
      console.error('Failed to save changes:', error)
      toast.error(`Failed to save changes: ${error}`)
    }
  }, [workspaceId, tabId, tableName, tabResult, editingState, clearPendingChanges, setTabResult])

  const discardPendingChanges = useCallback(() => {
    if (!workspaceId || !tabId) return
    clearPendingChanges(workspaceId, tabId)
  }, [workspaceId, tabId, clearPendingChanges])

  return {
    isTableMode,
    editingState,
    startEditing,
    commitCellEdit,
    cancelEditing,
    savePendingChanges,
    discardPendingChanges,
  }
}
