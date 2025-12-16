import { useCallback } from 'react'

import { generateCountQuery, generateTableQuery } from '@/lib/sql-filter'
import { executeQuery, executeQueryWithCount } from '@/lib/tauri'
import { getErrorMessage } from '@/lib/utils'
import { useQueryHistoryStore } from '@/stores/queryHistoryStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'

export function useExecuteQuery() {
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)
  const setTabError = useWorkspaceManagerStore((s) => s.setTabError)
  const setTabLoading = useWorkspaceManagerStore((s) => s.setTabLoading)
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)
  const setTabPagination = useWorkspaceManagerStore((s) => s.setTabPagination)
  const addHistoryEntry = useQueryHistoryStore((s) => s.addEntry)

  const execute = useCallback(
    async (sql?: string) => {
      // Get fresh state to avoid stale closure issues
      const store = useWorkspaceManagerStore.getState()
      const workspace = store.getActiveWorkspace()
      const tab = store.getActiveTab()

      if (!workspace || !tab || !workspace.isConnected) {
        throw new Error('No active workspace/tab or not connected')
      }

      let queryToExecute = sql || tab.sql || ''
      let countQuery: string | undefined

      // For table tabs with pagination, generate SQL with OFFSET and ORDER BY
      if (tab.type === 'table' && tab.tableName && !sql) {
        const pagination = tab.pagination || { page: 1, pageSize: 100, totalCount: 0 }
        const offset = (pagination.page - 1) * pagination.pageSize
        const filters = tab.filters || []
        const sort = tab.sort

        queryToExecute = generateTableQuery(tab.tableName, filters, workspace.dbType, pagination.pageSize, offset, sort)
        countQuery = generateCountQuery(tab.tableName, filters, workspace.dbType)

        // Update tab SQL to show the actual query being executed
        setTabSql(workspace.id, tab.id, queryToExecute)
      }

      if (!queryToExecute.trim()) {
        return
      }

      setTabLoading(workspace.id, tab.id, true)

      const startTime = performance.now()

      try {
        // Use executeQueryWithCount for table tabs, regular executeQuery otherwise
        const result = countQuery
          ? await executeQueryWithCount(workspace.id, queryToExecute, countQuery)
          : await executeQuery(workspace.id, queryToExecute)

        const executionTimeMs = Math.round(performance.now() - startTime)

        setTabResult(workspace.id, tab.id, result)

        // Update pagination totalCount if present
        if (result.totalCount !== undefined && tab.type === 'table') {
          setTabPagination(workspace.id, tab.id, {
            totalCount: result.totalCount,
          })
        }

        // Add to history
        addHistoryEntry(workspace.id, {
          sql: queryToExecute,
          connectionName: workspace.name,
          executionTimeMs,
          rowCount: result.rows.length,
        })

        return result
      } catch (error) {
        const executionTimeMs = Math.round(performance.now() - startTime)
        const errorMessage = getErrorMessage(error)

        setTabError(workspace.id, tab.id, errorMessage)

        // Add error to history
        addHistoryEntry(workspace.id, {
          sql: queryToExecute,
          connectionName: workspace.name,
          executionTimeMs,
          error: errorMessage,
        })

        throw error
      } finally {
        setTabLoading(workspace.id, tab.id, false)
      }
    },
    [setTabResult, setTabError, setTabLoading, setTabSql, setTabPagination, addHistoryEntry]
  )

  return {
    execute,
    loading: activeTab?.loading ?? false,
    result: activeTab?.result ?? null,
    error: activeTab?.error ?? null,
  }
}
