import { useCallback } from 'react'

import { executeQuery, WORKSPACE_ID } from '@/lib/tauri'
import { getErrorMessage } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export function useExecuteQuery() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const tabs = useWorkspaceStore((s) => s.tabs)
  const isConnected = useWorkspaceStore((s) => s.isConnected)
  const setTabResult = useWorkspaceStore((s) => s.setTabResult)
  const setTabError = useWorkspaceStore((s) => s.setTabError)
  const setTabLoading = useWorkspaceStore((s) => s.setTabLoading)

  const activeTab = activeTabId ? tabs[activeTabId] : null

  const execute = useCallback(
    async (sql?: string) => {
      if (!activeTabId || !isConnected) {
        throw new Error('No active tab or not connected')
      }

      const queryToExecute = sql || activeTab?.sql || ''
      if (!queryToExecute.trim()) {
        return
      }

      setTabLoading(activeTabId, true)

      try {
        const result = await executeQuery(WORKSPACE_ID, queryToExecute)
        setTabResult(activeTabId, result)
        return result
      } catch (error) {
        setTabError(activeTabId, getErrorMessage(error))
        throw error
      } finally {
        setTabLoading(activeTabId, false)
      }
    },
    [activeTabId, activeTab?.sql, isConnected, setTabResult, setTabError, setTabLoading]
  )

  return {
    execute,
    loading: activeTab?.loading ?? false,
    result: activeTab?.result ?? null,
    error: activeTab?.error ?? null,
  }
}
