import { useCallback, useEffect, useState } from 'react'

import { executeQuery } from '@/lib/tauri'
import { getErrorMessage, sanitizeSqlIdentifier } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspace'

interface TableInfo {
  name: string
  type: 'table' | 'view'
}

/**
 * Hook to load and manage database tables list
 * Supports both PostgreSQL and SQLite
 */
export function useTableList(workspaceId: string | undefined, isConnected: boolean) {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setTabLoading = useWorkspaceManagerStore((s) => s.setTabLoading)
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)
  const setTabError = useWorkspaceManagerStore((s) => s.setTabError)
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const findTableTab = useWorkspaceManagerStore((s) => s.findTableTab)
  const switchTab = useWorkspaceManagerStore((s) => s.switchTab)

  const loadTables = useCallback(async () => {
    if (!isConnected || !workspaceId) return

    setLoading(true)
    setError(null)

    try {
      // Try PostgreSQL query first
      const result = await executeQuery(
        workspaceId,
        `
        SELECT table_name as name, 'table' as type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
      )

      if (result.rows.length > 0) {
        setTables(
          result.rows.map((row) => ({
            name: String(row[0]),
            type: (String(row[1]) as 'table' | 'view') || 'table',
          }))
        )
      }
    } catch {
      // Fallback to SQLite
      try {
        const result = await executeQuery(
          workspaceId,
          `
          SELECT name, type FROM sqlite_master
          WHERE type IN ('table', 'view')
          AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `
        )
        setTables(
          result.rows.map((row) => ({
            name: String(row[0]),
            type: (String(row[1]) as 'table' | 'view') || 'table',
          }))
        )
      } catch (err) {
        setTables([])
        setError(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }, [isConnected, workspaceId])

  // Load tables when workspace changes
  useEffect(() => {
    if (isConnected && workspaceId) {
      loadTables()
    } else {
      setTables([])
    }
  }, [isConnected, workspaceId, loadTables])

  /**
   * Handle table click - focus existing tab or create new one
   */
  const openTable = useCallback(
    async (tableName: string) => {
      if (!isConnected || !workspaceId) return

      const safeTableName = sanitizeSqlIdentifier(tableName)

      // Check if tab for this table already exists
      const existingTabId = findTableTab(workspaceId, safeTableName)
      if (existingTabId) {
        switchTab(workspaceId, existingTabId)
        return
      }

      // Create new tab if not exists
      const tabId = createTab(workspaceId, 'table', tableName, safeTableName)

      setTabLoading(workspaceId, tabId, true)
      try {
        const sql = `SELECT * FROM "${safeTableName}" LIMIT 100`
        const result = await executeQuery(workspaceId, sql)
        setTabResult(workspaceId, tabId, result)
      } catch (error) {
        setTabError(workspaceId, tabId, getErrorMessage(error))
      } finally {
        setTabLoading(workspaceId, tabId, false)
      }
    },
    [isConnected, workspaceId, findTableTab, switchTab, createTab, setTabLoading, setTabResult, setTabError]
  )

  return {
    tables,
    loading,
    error,
    loadTables,
    openTable,
  }
}
