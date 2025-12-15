import { readWorkspaceHistory, writeWorkspaceHistory } from '@/lib/storage'
import type { QueryHistoryEntry } from '@/types/query-history'
import { nanoid } from 'nanoid'
import { create } from 'zustand'

const MAX_ENTRIES = 100

interface QueryHistoryState {
  // History entries keyed by workspaceId
  historyByWorkspace: Record<string, QueryHistoryEntry[]>
  // Loading state per workspace
  loadingWorkspaces: Set<string>
  // Loaded workspaces (to avoid re-loading)
  loadedWorkspaces: Set<string>
}

interface QueryHistoryActions {
  // Load history for a workspace from disk
  loadWorkspaceHistory: (workspaceId: string) => Promise<void>
  // Add entry to workspace history
  addEntry: (workspaceId: string, entry: Omit<QueryHistoryEntry, 'id' | 'timestamp' | 'workspaceId'>) => void
  // Remove single entry
  removeEntry: (workspaceId: string, entryId: string) => void
  // Clear workspace history
  clearWorkspaceHistory: (workspaceId: string) => void
  // Get history for workspace
  getHistory: (workspaceId: string) => QueryHistoryEntry[]
  // Search history
  searchHistory: (workspaceId: string, query: string) => QueryHistoryEntry[]
}

type QueryHistoryStore = QueryHistoryState & QueryHistoryActions

export const useQueryHistoryStore = create<QueryHistoryStore>()((set, get) => ({
  // Initial state
  historyByWorkspace: {},
  loadingWorkspaces: new Set(),
  loadedWorkspaces: new Set(),

  // Load history from disk for a workspace
  loadWorkspaceHistory: async (workspaceId: string) => {
    const state = get()

    // Skip if already loaded or loading
    if (state.loadedWorkspaces.has(workspaceId) || state.loadingWorkspaces.has(workspaceId)) {
      return
    }

    // Mark as loading
    set((s) => ({
      loadingWorkspaces: new Set([...s.loadingWorkspaces, workspaceId]),
    }))

    try {
      const history = (await readWorkspaceHistory(workspaceId)) as QueryHistoryEntry[]

      set((s) => ({
        historyByWorkspace: {
          ...s.historyByWorkspace,
          [workspaceId]: history || [],
        },
        loadedWorkspaces: new Set([...s.loadedWorkspaces, workspaceId]),
        loadingWorkspaces: new Set([...s.loadingWorkspaces].filter((id) => id !== workspaceId)),
      }))
    } catch (error) {
      console.error('Failed to load workspace history:', error)
      set((s) => ({
        historyByWorkspace: {
          ...s.historyByWorkspace,
          [workspaceId]: [],
        },
        loadedWorkspaces: new Set([...s.loadedWorkspaces, workspaceId]),
        loadingWorkspaces: new Set([...s.loadingWorkspaces].filter((id) => id !== workspaceId)),
      }))
    }
  },

  // Add entry with FIFO eviction
  addEntry: (workspaceId, entry) => {
    const newEntry: QueryHistoryEntry = {
      ...entry,
      id: nanoid(),
      timestamp: Date.now(),
      workspaceId,
      connectionName: entry.connectionName,
    }

    set((state) => {
      const currentHistory = state.historyByWorkspace[workspaceId] || []
      const newHistory = [newEntry, ...currentHistory]

      // FIFO eviction if exceeds max entries
      if (newHistory.length > MAX_ENTRIES) {
        newHistory.splice(MAX_ENTRIES)
      }

      const updated = {
        ...state.historyByWorkspace,
        [workspaceId]: newHistory,
      }

      // Persist to disk (async, don't wait)
      writeWorkspaceHistory(workspaceId, newHistory).catch(console.error)

      return { historyByWorkspace: updated }
    })
  },

  // Remove single entry
  removeEntry: (workspaceId, entryId) => {
    set((state) => {
      const currentHistory = state.historyByWorkspace[workspaceId] || []
      const newHistory = currentHistory.filter((entry) => entry.id !== entryId)

      const updated = {
        ...state.historyByWorkspace,
        [workspaceId]: newHistory,
      }

      // Persist to disk
      writeWorkspaceHistory(workspaceId, newHistory).catch(console.error)

      return { historyByWorkspace: updated }
    })
  },

  // Clear workspace history
  clearWorkspaceHistory: (workspaceId) => {
    set((state) => {
      const updated = {
        ...state.historyByWorkspace,
        [workspaceId]: [],
      }

      // Persist to disk
      writeWorkspaceHistory(workspaceId, []).catch(console.error)

      return { historyByWorkspace: updated }
    })
  },

  // Get history for workspace
  getHistory: (workspaceId) => {
    const state = get()
    return state.historyByWorkspace[workspaceId] || []
  },

  // Search history by SQL content
  searchHistory: (workspaceId, query) => {
    const state = get()
    const history = state.historyByWorkspace[workspaceId] || []
    const lowerQuery = query.toLowerCase()
    return history.filter((entry) => entry.sql.toLowerCase().includes(lowerQuery))
  },
}))
