import type { QueryResult } from '@/types/database'
import type { Tab, WorkspaceState } from '@/types/workspace'
import { sanitizeSqlIdentifier } from '@/lib/utils'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Helper to create a default tab
function createDefaultTab(): Tab {
  return {
    id: nanoid(),
    type: 'query',
    name: 'SQL Query',
    sql: '',
    result: null,
    error: null,
    loading: false,
    isDirty: false,
  }
}

interface WorkspaceStore extends WorkspaceState {
  // Connection
  connect: (connectionId: string) => void
  disconnect: () => void
  setConnected: (connected: boolean) => void

  // Tab CRUD
  createTab: (type: 'query' | 'table', name: string, tableName?: string) => string
  closeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  renameTab: (tabId: string, name: string) => void

  // Tab state
  setTabSql: (tabId: string, sql: string) => void
  setTabCursorPosition: (tabId: string, pos: { line: number; column: number }) => void
  setTabResult: (tabId: string, result: QueryResult) => void
  setTabError: (tabId: string, error: string | null) => void
  setTabLoading: (tabId: string, loading: boolean) => void
  setTabDirty: (tabId: string, dirty: boolean) => void

  // Selectors
  getActiveTab: () => Tab | null
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => {
      const defaultTab = createDefaultTab()

      return {
        // Initial state
        connectionId: null,
        isConnected: false,
        tabs: { [defaultTab.id]: defaultTab },
        tabOrder: [defaultTab.id],
        activeTabId: defaultTab.id,

        // Connection methods
        connect: (connectionId) => {
          set({ connectionId, isConnected: false })
        },

        disconnect: () => {
          set({ connectionId: null, isConnected: false })
        },

        setConnected: (connected) => {
          set({ isConnected: connected })
        },

        // Tab CRUD
        createTab: (type, name, tableName) => {
          const tabId = nanoid()
          const safeTableName = tableName ? sanitizeSqlIdentifier(tableName) : ''
          const sql = type === 'table' && safeTableName ? `SELECT * FROM "${safeTableName}" LIMIT 100` : ''

          const tab: Tab = {
            id: tabId,
            type,
            name,
            tableName,
            sql,
            result: null,
            error: null,
            loading: false,
            isDirty: false,
          }

          set((s) => ({
            tabs: { ...s.tabs, [tabId]: tab },
            tabOrder: [...s.tabOrder, tabId],
            activeTabId: tabId,
          }))

          return tabId
        },

        closeTab: (tabId) => {
          set((s) => {
            // Don't close the last tab
            if (s.tabOrder.length <= 1) return s

            const { [tabId]: _removed, ...restTabs } = s.tabs
            const newOrder = s.tabOrder.filter((id) => id !== tabId)
            const newActive = s.activeTabId === tabId ? newOrder[newOrder.length - 1] || null : s.activeTabId

            return {
              tabs: restTabs,
              tabOrder: newOrder,
              activeTabId: newActive,
            }
          })
        },

        switchTab: (tabId) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return { activeTabId: tabId }
          })
        },

        reorderTabs: (fromIndex, toIndex) => {
          set((s) => {
            const newOrder = [...s.tabOrder]
            const [moved] = newOrder.splice(fromIndex, 1)
            newOrder.splice(toIndex, 0, moved)
            return { tabOrder: newOrder }
          })
        },

        renameTab: (tabId, name) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return {
              tabs: {
                ...s.tabs,
                [tabId]: { ...s.tabs[tabId], name },
              },
            }
          })
        },

        // Tab state methods
        setTabSql: (tabId, sql) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return {
              tabs: {
                ...s.tabs,
                [tabId]: { ...s.tabs[tabId], sql, isDirty: true },
              },
            }
          })
        },

        setTabCursorPosition: (tabId, pos) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return {
              tabs: {
                ...s.tabs,
                [tabId]: { ...s.tabs[tabId], cursorPosition: pos },
              },
            }
          })
        },

        setTabResult: (tabId, result) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return {
              tabs: {
                ...s.tabs,
                [tabId]: { ...s.tabs[tabId], result, error: null, isDirty: false },
              },
            }
          })
        },

        setTabError: (tabId, error) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return {
              tabs: {
                ...s.tabs,
                [tabId]: { ...s.tabs[tabId], error, result: null },
              },
            }
          })
        },

        setTabLoading: (tabId, loading) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return {
              tabs: {
                ...s.tabs,
                [tabId]: { ...s.tabs[tabId], loading },
              },
            }
          })
        },

        setTabDirty: (tabId, dirty) => {
          set((s) => {
            if (!s.tabs[tabId]) return s
            return {
              tabs: {
                ...s.tabs,
                [tabId]: { ...s.tabs[tabId], isDirty: dirty },
              },
            }
          })
        },

        // Selectors
        getActiveTab: () => {
          const state = get()
          if (!state.activeTabId) return null
          return state.tabs[state.activeTabId] || null
        },
      }
    },
    {
      name: 'quill-workspace',
      version: 4,
      partialize: (state) => ({
        // Only persist connectionId - tabs are session-only
        connectionId: state.connectionId,
      }),
      merge: (persisted, current) => {
        // Merge persisted connectionId with fresh tabs
        const p = persisted as { connectionId?: string | null }
        return {
          ...current,
          connectionId: p.connectionId ?? null,
        }
      },
    }
  )
)
