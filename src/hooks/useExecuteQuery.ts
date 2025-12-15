import { useCallback } from 'react'

import { executeQuery } from '@/lib/tauri'
import { getErrorMessage } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'

export function useExecuteQuery() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabResult = useWorkspaceManagerStore((s) => s.setTabResult)
  const setTabError = useWorkspaceManagerStore((s) => s.setTabError)
  const setTabLoading = useWorkspaceManagerStore((s) => s.setTabLoading)

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

      try {
        const result = await executeQuery(activeWorkspace.id, queryToExecute)
        setTabResult(activeWorkspace.id, activeTab.id, result)
        return result
      } catch (error) {
        setTabError(activeWorkspace.id, activeTab.id, getErrorMessage(error))
        throw error
      } finally {
        setTabLoading(activeWorkspace.id, activeTab.id, false)
      }
    },
    [activeWorkspace, activeTab, setTabResult, setTabError, setTabLoading]
  )

  return {
    execute,
    loading: activeTab?.loading ?? false,
    result: activeTab?.result ?? null,
    error: activeTab?.error ?? null,
  }
}
