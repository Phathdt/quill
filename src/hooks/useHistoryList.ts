import { useCallback, useEffect, useMemo } from 'react'

import { useQueryHistoryStore } from '@/stores/queryHistoryStore'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'

/**
 * Hook to manage query history for a workspace
 * Handles loading, filtering, and selecting history entries
 */
export function useHistoryList(workspaceId: string | undefined, searchQuery: string = '') {
  const historyByWorkspace = useQueryHistoryStore((s) => s.historyByWorkspace)
  const loadWorkspaceHistory = useQueryHistoryStore((s) => s.loadWorkspaceHistory)
  const removeHistoryEntry = useQueryHistoryStore((s) => s.removeEntry)
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)

  // Filter history by search
  const filteredHistory = useMemo(() => {
    const history = workspaceId ? historyByWorkspace[workspaceId] || [] : []
    if (!searchQuery.trim()) return history
    const term = searchQuery.toLowerCase()
    return history.filter((entry) => entry.sql.toLowerCase().includes(term))
  }, [workspaceId, historyByWorkspace, searchQuery])

  // Load history when workspace changes
  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceHistory(workspaceId)
    }
  }, [workspaceId, loadWorkspaceHistory])

  /**
   * Load history entry into active tab editor
   */
  const loadHistoryEntry = useCallback(
    (sql: string) => {
      const activeWorkspace = useWorkspaceManagerStore.getState().getActiveWorkspace()
      const activeTab = useWorkspaceManagerStore.getState().getActiveTab()

      if (activeWorkspace && activeTab) {
        setTabSql(activeWorkspace.id, activeTab.id, sql)
      }
    },
    [setTabSql]
  )

  /**
   * Remove a history entry
   */
  const removeEntry = useCallback(
    (entryId: string) => {
      if (workspaceId) {
        removeHistoryEntry(workspaceId, entryId)
      }
    },
    [workspaceId, removeHistoryEntry]
  )

  /**
   * Format relative time for history entries
   */
  const formatRelativeTime = useCallback((timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }, [])

  return {
    history: filteredHistory,
    loadHistoryEntry,
    removeEntry,
    formatRelativeTime,
  }
}
