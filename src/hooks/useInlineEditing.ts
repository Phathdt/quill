import { useCallback, useEffect, useMemo } from 'react'

import { deleteRows, getPrimaryKey, insertRow, updateRow } from '@/lib/tauri'
import { toast } from '@/lib/toast'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import type { CellEdit } from '@/types/editing'

export function useInlineEditing() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setPrimaryKeyColumns = useWorkspaceManagerStore((s) => s.setPrimaryKeyColumns)
  const addPendingChange = useWorkspaceManagerStore((s) => s.addPendingChange)
  const clearPendingChanges = useWorkspaceManagerStore((s) => s.clearPendingChanges)
  const clearPendingNewRows = useWorkspaceManagerStore((s) => s.clearPendingNewRows)
  const clearPendingDeletes = useWorkspaceManagerStore((s) => s.clearPendingDeletes)
  const clearPendingDdls = useWorkspaceManagerStore((s) => s.clearPendingDdls)
  const updatePendingNewRow = useWorkspaceManagerStore((s) => s.updatePendingNewRow)
  const setEditingCell = useWorkspaceManagerStore((s) => s.setEditingCell)
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)

  // Subscribe directly to editingState for proper reactivity
  const editingState = useWorkspaceManagerStore((s) => {
    const ws = s.getActiveWorkspace()
    if (!ws || !ws.activeTabId) return null
    return ws.tabs[ws.activeTabId]?.editingState ?? null
  })
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

      // Get fresh pendingNewRows from store (avoid stale closure)
      const currentTab = useWorkspaceManagerStore.getState().workspaces[workspaceId]?.tabs[tabId]
      const pendingNewRows = currentTab?.editingState?.pendingNewRows ?? []

      const existingRowCount = tabResult.rows.length

      // Check if this is editing a pending new row (rowIndex >= existing rows count)
      if (rowIndex >= existingRowCount) {
        const pendingRowIndex = rowIndex - existingRowCount
        const pendingRow = pendingNewRows[pendingRowIndex]

        if (pendingRow) {
          // Update the pending new row's values directly
          updatePendingNewRow(workspaceId, tabId, pendingRow.tempId, columnName, newValue)
          setEditingCell(workspaceId, tabId, null)
          return
        }
      }

      // Editing an existing row - use pendingChanges
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
    [workspaceId, tabId, tabResult, addPendingChange, updatePendingNewRow, setEditingCell]
  )

  const cancelEditing = useCallback(() => {
    if (!workspaceId || !tabId) return
    setEditingCell(workspaceId, tabId, null)
  }, [workspaceId, tabId, setEditingCell])

  // Save ALL pending changes across ALL table tabs in the workspace
  const savePendingChanges = useCallback(async () => {
    if (!workspaceId || !workspaceTabs) return

    // Collect all tabs with pending changes, new rows, deletes, or DDLs
    const allTabs = Object.values(workspaceTabs)
    const tabsWithChanges = allTabs.filter((tab) => {
      if (tab.type !== 'table' || !tab.tableName) return false
      const changes = tab.editingState?.pendingChanges ?? {}
      const newRows = tab.editingState?.pendingNewRows ?? []
      const deletes = tab.editingState?.pendingDeletes ?? []
      const ddls = tab.editingState?.pendingDdls ?? []
      return Object.keys(changes).length > 0 || newRows.length > 0 || deletes.length > 0 || ddls.length > 0
    })

    if (tabsWithChanges.length === 0) return

    let totalRowsUpdated = 0
    let totalRowsInserted = 0
    let totalRowsDeleted = 0
    let parts_ddl = 0
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
              // Filter out null values (for auto-generated columns like id/serial)
              const columnValues = Object.entries(pendingRow.values)
                .filter(([, value]) => value !== null && value !== undefined)
                .map(([column, value]) => ({
                  column,
                  value,
                }))

              // Skip if no values to insert
              if (columnValues.length === 0) {
                console.warn('[savePendingChanges] Skipping row with no values:', pendingRow.tempId)
                continue
              }

              console.log('[savePendingChanges] Inserting row:', {
                table: tabTableName,
                tempId: pendingRow.tempId,
                columnValues,
                rawValues: pendingRow.values,
              })

              const insertResult = await insertRow(workspaceId, tabTableName, columnValues)
              console.log('[savePendingChanges] Insert result:', insertResult)

              if (insertResult.rows.length > 0) {
                insertedRows.push(insertResult.rows[0] as (string | number | boolean | null)[])
                totalRowsInserted++
              }
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : JSON.stringify(e)
              console.error('[savePendingChanges] Insert error:', {
                table: tabTableName,
                pendingRow,
                error: e,
                errorStr: errMsg,
              })
              errors.push(`Insert into ${tabTableName} failed: ${errMsg}`)
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

        // Handle row deletions
        const pendingDeletes = tab.editingState?.pendingDeletes ?? []
        if (pendingDeletes.length > 0 && tabResultData) {
          const primaryKeys = tab.editingState?.primaryKeyColumns ?? []

          if (primaryKeys.length === 0) {
            errors.push(`${tabTableName}: No primary key found for deletes`)
          } else {
            try {
              // Build primary key values for each row to delete
              const rowsToDelete = pendingDeletes.map((rowIndex) => {
                const row = tabResultData.rows[rowIndex]
                return primaryKeys.map((pkCol: string) => {
                  const colIndex = tabResultData.columns.findIndex((c: { name: string }) => c.name === pkCol)
                  return { column: pkCol, value: row[colIndex] }
                })
              })

              await deleteRows(workspaceId, tabTableName, rowsToDelete)

              // Remove deleted rows from local result (sort indices descending to avoid shifting)
              const sortedIndices = [...pendingDeletes].sort((a, b) => b - a)
              const newRows = [...tabResultData.rows]
              for (const idx of sortedIndices) {
                newRows.splice(idx, 1)
              }

              setTabResult(workspaceId, tab.id, {
                ...tabResultData,
                rows: newRows,
              })

              totalRowsDeleted += pendingDeletes.length
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : JSON.stringify(e)
              errors.push(`Delete from ${tabTableName} failed: ${errMsg}`)
            }
          }

          clearPendingDeletes(workspaceId, tab.id)
        }

        // Handle pending DDL statements (from Structure view)
        const pendingDdls = tab.editingState?.pendingDdls ?? []
        if (pendingDdls.length > 0) {
          const { executeQuery } = await import('@/lib/tauri')
          for (const sql of pendingDdls) {
            await executeQuery(workspaceId, sql)
          }
          clearPendingDdls(workspaceId, tab.id)
          totalRowsUpdated += 0 // DDL doesn't affect row counts
          parts_ddl += pendingDdls.length
        }
      }

      // Build success message
      const parts: string[] = []
      if (totalRowsUpdated > 0) parts.push(`Updated ${totalRowsUpdated} row(s)`)
      if (totalRowsInserted > 0) parts.push(`Inserted ${totalRowsInserted} row(s)`)
      if (totalRowsDeleted > 0) parts.push(`Deleted ${totalRowsDeleted} row(s)`)
      if (parts_ddl > 0) parts.push(`Applied ${parts_ddl} DDL change${parts_ddl > 1 ? 's' : ''}`)

      if (errors.length > 0) {
        toast.error(errors[0])
      } else if (parts.length > 0) {
        const tableCount = tabsWithChanges.length
        toast.success(`${parts.join(', ')}${tableCount > 1 ? ` in ${tableCount} tables` : ''}`)
      }
    } catch (error) {
      console.error('Failed to save changes:', error)
      toast.error(`Failed to save changes: ${error}`)
    }
  }, [workspaceId, workspaceTabs, clearPendingChanges, clearPendingNewRows, clearPendingDeletes, clearPendingDdls, setTabResult])

  // Discard ALL pending changes across ALL table tabs in the workspace
  const discardPendingChanges = useCallback(() => {
    if (!workspaceId || !workspaceTabs) return

    // Clear pending changes, new rows, and deletes from all table tabs
    for (const tab of Object.values(workspaceTabs)) {
      if (tab.type !== 'table') continue
      const changes = tab.editingState?.pendingChanges ?? {}
      const newRows = tab.editingState?.pendingNewRows ?? []
      const deletes = tab.editingState?.pendingDeletes ?? []
      const ddls = tab.editingState?.pendingDdls ?? []
      if (Object.keys(changes).length > 0) clearPendingChanges(workspaceId, tab.id)
      if (newRows.length > 0) clearPendingNewRows(workspaceId, tab.id)
      if (deletes.length > 0) clearPendingDeletes(workspaceId, tab.id)
      if (ddls.length > 0) clearPendingDdls(workspaceId, tab.id)
    }
  }, [workspaceId, workspaceTabs, clearPendingChanges, clearPendingNewRows, clearPendingDeletes, clearPendingDdls])

  const hasPendingChanges = useMemo(() => {
    if (!workspaceTabs) return false
    return Object.values(workspaceTabs).some((tab) => {
      if (tab.type !== 'table') return false
      const changes = tab.editingState?.pendingChanges ?? {}
      const newRows = tab.editingState?.pendingNewRows ?? []
      const deletes = tab.editingState?.pendingDeletes ?? []
      const ddls = tab.editingState?.pendingDdls ?? []
      return Object.keys(changes).length > 0 || newRows.length > 0 || deletes.length > 0 || ddls.length > 0
    })
  }, [workspaceTabs])

  return {
    isTableMode,
    editingState,
    hasPendingChanges,
    startEditing,
    commitCellEdit,
    cancelEditing,
    savePendingChanges,
    discardPendingChanges,
  }
}
