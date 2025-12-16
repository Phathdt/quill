import { useCallback } from 'react'

import { generateTableQuery } from '@/lib/sql-filter'
import { executeQuery } from '@/lib/tauri'
import { getErrorMessage } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspace'

export function useTableFilter() {
  const applyFilters = useCallback(async () => {
    // Get fresh state inside callback to avoid stale closures
    const store = useWorkspaceManagerStore.getState()
    const activeWorkspace = store.getActiveWorkspace()
    const activeTab = store.getActiveTab()

    if (!activeWorkspace || !activeTab || activeTab.type !== 'table') {
      return
    }

    const { tableName, filters = [] } = activeTab
    if (!tableName) {
      return
    }

    const dbType = activeWorkspace.dbType
    const sql = generateTableQuery(tableName, filters, dbType)

    // Update tab SQL (for reference/display)
    store.setTabSql(activeWorkspace.id, activeTab.id, sql)
    store.setTabLoading(activeWorkspace.id, activeTab.id, true)

    try {
      const result = await executeQuery(activeWorkspace.id, sql)
      store.setTabResult(activeWorkspace.id, activeTab.id, result)
    } catch (error) {
      store.setTabError(activeWorkspace.id, activeTab.id, getErrorMessage(error))
    } finally {
      store.setTabLoading(activeWorkspace.id, activeTab.id, false)
    }
  }, [])

  return { applyFilters }
}
