import { useCallback, useEffect } from 'react'

import { getPrimaryKey, insertRow, updateRow } from '@/lib/tauri'
import { toast } from '@/lib/toast'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { CellEdit } from '@/types/editing'

export function useInlineEditing() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setPrimaryKeyColumns = useWorkspaceManagerStore((s) => s.setPrimaryKeyColumns)
  const addPendingChange = useWorkspaceManagerStore((s) => s.addPendingChange)
  const clearPendingChanges = useWorkspaceManagerStore((s) => s.clearPendingChanges)
  const clearPendingNewRows = useWorkspaceManagerStore((s) => s.clearPendingNewRows)
  const setEditingCell = useWorkspaceManagerStore((s) => s.setEditingCell)
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)

  const editingState = activeTab?.editingState
  const isTableMode = activeTab?.type === 'table'

  // Extract for stable dependencies
  const workspaceId = activeWorkspace?.id
  const workspaceTabs = activeWorkspace?.tabs
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

  // Save ALL pending changes across ALL table tabs in the workspace
  const savePendingChanges = useCallback(async () => {
    if (!workspaceId || !workspaceTabs) return

    // Collect all tabs with pending changes or pending new rows
    const allTabs = Object.values(workspaceTabs)
    const tabsWithChanges = allTabs.filter((tab) => {
      if (tab.type !== 'table' || !tab.tableName) return false
      const changes = tab.editingState?.pendingChanges ?? {}
      const newRows = tab.editingState?.pendingNewRows ?? []
      return Object.keys(changes).length > 0 || newRows.length > 0
    })

    if (tabsWithChanges.length === 0) return

    let totalRowsUpdated = 0
    let totalRowsInserted = 0
    const errors: string[] = []

    try {
      for (const tab of tabsWithChanges) {
        const tabTableName = tab.tableName!
        const tabResultData = tab.result
        const pendingChanges = tab.editingState?.pendingChanges ?? {}
        const pendingNewRows = tab.editingState?.pendingNewRows ?? []
        const primaryKeys = tab.editingState?.primaryKeyColumns ?? []

        // Handle cell edits (updates)
        if (Object.keys(pendingChanges).length > 0) {
          if (!tabResultData || primaryKeys.length === 0) {
            errors.push(`${tabTableName}: No primary key found for updates`)
          } else {
            // Group changes by row
            const changesByRow: Record<number, CellEdit[]> = {}
            for (const change of Object.values(pendingChanges) as CellEdit[]) {
              if (!changesByRow[change.rowIndex]) {
                changesByRow[change.rowIndex] = []
              }
              changesByRow[change.rowIndex].push(change)
            }

            // Update each row
            for (const [rowIndexStr, rowChanges] of Object.entries(changesByRow)) {
              const rowIndex = parseInt(rowIndexStr, 10)
              const row = tabResultData.rows[rowIndex]

              // Build primary key values
              const pkValues = primaryKeys.map((pkCol: string) => {
                const colIndex = tabResultData.columns.findIndex((c: { name: string }) => c.name === pkCol)
                return {
                  column: pkCol,
                  value: row[colIndex],
                }
              })

              // Build updates
              const updates = rowChanges.map((change) => ({
                column: change.columnName,
                value: change.newValue,
              }))

              await updateRow(workspaceId, tabTableName, pkValues, updates)

              // Update local result with new values
              const newRows = [...tabResultData.rows]
              for (const change of rowChanges) {
                const colIndex = tabResultData.columns.findIndex((c: { name: string }) => c.name === change.columnName)
                newRows[rowIndex][colIndex] = change.newValue as string | number | boolean | null
              }

              setTabResult(workspaceId, tab.id, {
                ...tabResultData,
                rows: newRows,
              })

              totalRowsUpdated++
            }
          }
          clearPendingChanges(workspaceId, tab.id)
        }

        // Handle new rows (inserts)
        if (pendingNewRows.length > 0 && tabResultData) {
          const insertedRows: (string | number | boolean | null)[][] = []

          for (const pendingRow of pendingNewRows) {
            try {
              const columnValues = Object.entries(pendingRow.values).map(([column, value]) => ({
                column,
                value,
              }))

              const insertResult = await insertRow(workspaceId, tabTableName, columnValues)
              if (insertResult.rows.length > 0) {
                insertedRows.push(insertResult.rows[0] as (string | number | boolean | null)[])
                totalRowsInserted++
              }
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : String(e)
              errors.push(`Insert failed: ${errMsg}`)
            }
          }

          // Add all inserted rows to local result
          if (insertedRows.length > 0) {
            setTabResult(workspaceId, tab.id, {
              ...tabResultData,
              rows: [...tabResultData.rows, ...insertedRows],
            })
          }

          clearPendingNewRows(workspaceId, tab.id)
        }
      }

      // Build success message
      const parts: string[] = []
      if (totalRowsUpdated > 0) parts.push(`Updated ${totalRowsUpdated} row(s)`)
      if (totalRowsInserted > 0) parts.push(`Inserted ${totalRowsInserted} row(s)`)

      if (errors.length > 0) {
        toast.error(`Some operations failed: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}`)
      } else if (parts.length > 0) {
        const tableCount = tabsWithChanges.length
        toast.success(`${parts.join(', ')}${tableCount > 1 ? ` in ${tableCount} tables` : ''}`)
      }
    } catch (error) {
      console.error('Failed to save changes:', error)
      toast.error(`Failed to save changes: ${error}`)
    }
  }, [workspaceId, workspaceTabs, clearPendingChanges, clearPendingNewRows, setTabResult])

  // Discard ALL pending changes across ALL table tabs in the workspace
  const discardPendingChanges = useCallback(() => {
    if (!workspaceId || !workspaceTabs) return

    // Clear pending changes and new rows from all table tabs
    for (const tab of Object.values(workspaceTabs)) {
      if (tab.type !== 'table') continue
      const changes = tab.editingState?.pendingChanges ?? {}
      const newRows = tab.editingState?.pendingNewRows ?? []
      if (Object.keys(changes).length > 0) {
        clearPendingChanges(workspaceId, tab.id)
      }
      if (newRows.length > 0) {
        clearPendingNewRows(workspaceId, tab.id)
      }
    }
  }, [workspaceId, workspaceTabs, clearPendingChanges, clearPendingNewRows])

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
