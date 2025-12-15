import { useCallback } from 'react'

import { executeQuery } from '@/lib/tauri'
import { getErrorMessage } from '@/lib/utils'
import { useQueryHistoryStore } from '@/stores/queryHistoryStore'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'

export function useExecuteQuery() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)
  const setTabError = useWorkspaceManagerStore((s) => s.setTabError)
  const setTabLoading = useWorkspaceManagerStore((s) => s.setTabLoading)
  const addHistoryEntry = useQueryHistoryStore((s) => s.addEntry)

  const execute = useCallback(
    async (sql?: string) => {
      if (!activeWorkspace || !activeTab || !activeWorkspace.isConnected) {
        throw new Error('No active workspace/tab or not connected')
      }

      const queryToExecute = sql || activeTab.sql || ''
      if (!queryToExecute.trim()) {
        return
      }

      setTabLoading(activeWorkspace.id, activeTab.id, true)

      const startTime = performance.now()

      try {
        const result = await executeQuery(activeWorkspace.id, queryToExecute)
        const executionTimeMs = Math.round(performance.now() - startTime)

        setTabResult(activeWorkspace.id, activeTab.id, result)

        // Add to history
        addHistoryEntry(activeWorkspace.id, {
          sql: queryToExecute,
          connectionName: activeWorkspace.name,
          executionTimeMs,
          rowCount: result.rows.length,
        })

        return result
      } catch (error) {
        const executionTimeMs = Math.round(performance.now() - startTime)
        const errorMessage = getErrorMessage(error)

        setTabError(activeWorkspace.id, activeTab.id, errorMessage)

        // Add error to history
        addHistoryEntry(activeWorkspace.id, {
          sql: queryToExecute,
          connectionName: activeWorkspace.name,
          executionTimeMs,
          error: errorMessage,
        })

        throw error
      } finally {
        setTabLoading(activeWorkspace.id, activeTab.id, false)
      }
    },
    [activeWorkspace, activeTab, setTabResult, setTabError, setTabLoading, addHistoryEntry]
  )

  return {
    execute,
    loading: activeTab?.loading ?? false,
    result: activeTab?.result ?? null,
    error: activeTab?.error ?? null,
  }
}
