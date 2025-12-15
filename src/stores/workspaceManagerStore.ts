import type { Connection } from '@/types/connection'
import type { QueryResult } from '@/types/database'
import type { DbType, Tab, TableFilter, Workspace, WorkspaceManagerState } from '@/types/workspace'
import { nanoid } from 'nanoid'
import { create } from 'zustand'

const MAX_WORKSPACES = 5

// Helper: create default tab for new workspace
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

interface WorkspaceManagerStore extends WorkspaceManagerState {
  // Workspace CRUD
  createWorkspace: (connection: Connection) => string | null
  closeWorkspace: (workspaceId: string) => void
  switchWorkspace: (workspaceId: string) => void

  // Connection state
  setWorkspaceConnected: (workspaceId: string, connected: boolean) => void
  setWorkspaceSchema: (workspaceId: string, schema: string) => void

  // Tab operations (scoped to workspace)
  createTab: (workspaceId: string, type: 'query' | 'table', name: string, tableName?: string) => string
  closeTab: (workspaceId: string, tabId: string) => void
  switchTab: (workspaceId: string, tabId: string) => void
  setTabSql: (workspaceId: string, tabId: string, sql: string) => void
  setTabResult: (workspaceId: string, tabId: string, result: QueryResult) => void
  setTabError: (workspaceId: string, tabId: string, error: string | null) => void
  setTabLoading: (workspaceId: string, tabId: string, loading: boolean) => void

  // Filter operations (table mode only)
  setTabFilters: (workspaceId: string, tabId: string, filters: TableFilter[]) => void
  addTabFilter: (workspaceId: string, tabId: string, filter: TableFilter) => void
  updateTabFilter: (workspaceId: string, tabId: string, filterId: string, updates: Partial<TableFilter>) => void
  removeTabFilter: (workspaceId: string, tabId: string, filterId: string) => void
  clearTabFilters: (workspaceId: string, tabId: string) => void

  // Selectors
  getActiveWorkspace: () => Workspace | null
  getActiveTab: () => Tab | null
  getWorkspaceById: (id: string) => Workspace | null
  canCreateWorkspace: () => boolean
}

export const useWorkspaceManagerStore = create<WorkspaceManagerStore>((set, get) => ({
  // Initial state
  workspaces: {},
  workspaceOrder: [],
  activeWorkspaceId: null,

  // Workspace CRUD
  createWorkspace: (connection) => {
    const state = get()
    if (state.workspaceOrder.length >= MAX_WORKSPACES) return null

    const workspaceId = nanoid()
    const defaultTab = createDefaultTab()
    const dbType: DbType = connection.type === 'postgres' ? 'postgres' : 'sqlite'

    const workspace: Workspace = {
      id: workspaceId,
      connectionId: connection.id,
      name: connection.name,
      dbType,
      isConnected: false,
      schema: dbType === 'postgres' ? 'public' : undefined,
      tabs: { [defaultTab.id]: defaultTab },
      tabOrder: [defaultTab.id],
      activeTabId: defaultTab.id,
    }

    set((s) => ({
      workspaces: { ...s.workspaces, [workspaceId]: workspace },
      workspaceOrder: [...s.workspaceOrder, workspaceId],
      activeWorkspaceId: workspaceId,
    }))

    return workspaceId
  },

  closeWorkspace: (workspaceId) => {
    set((s) => {
      const { [workspaceId]: _removed, ...restWorkspaces } = s.workspaces
      const newOrder = s.workspaceOrder.filter((id) => id !== workspaceId)
      const newActive =
        s.activeWorkspaceId === workspaceId ? newOrder[newOrder.length - 1] || null : s.activeWorkspaceId

      return {
        workspaces: restWorkspaces,
        workspaceOrder: newOrder,
        activeWorkspaceId: newActive,
      }
    })
  },

  switchWorkspace: (workspaceId) => {
    set((s) => {
      if (!s.workspaces[workspaceId]) return s
      return { activeWorkspaceId: workspaceId }
    })
  },

  // Connection state
  setWorkspaceConnected: (workspaceId, connected) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: { ...ws, isConnected: connected },
        },
      }
    })
  },

  setWorkspaceSchema: (workspaceId, schema) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: { ...ws, schema },
        },
      }
    })
  },

  // Tab operations
  createTab: (workspaceId, type, name, tableName) => {
    const tabId = nanoid()
    const sql = type === 'table' && tableName ? `SELECT * FROM "${tableName}" LIMIT 100` : ''

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
      filters: type === 'table' ? [] : undefined,
    }

    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: { ...ws.tabs, [tabId]: tab },
            tabOrder: [...ws.tabOrder, tabId],
            activeTabId: tabId,
          },
        },
      }
    })

    return tabId
  },

  closeTab: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || ws.tabOrder.length <= 1) return s

      const { [tabId]: _removed, ...restTabs } = ws.tabs
      const newOrder = ws.tabOrder.filter((id) => id !== tabId)
      const newActive = ws.activeTabId === tabId ? newOrder[newOrder.length - 1] || null : ws.activeTabId

      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: restTabs,
            tabOrder: newOrder,
            activeTabId: newActive,
          },
        },
      }
    })
  },

  switchTab: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: { ...ws, activeTabId: tabId },
        },
      }
    })
  },

  setTabSql: (workspaceId, tabId, sql) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...ws.tabs[tabId], sql, isDirty: true },
            },
          },
        },
      }
    })
  },

  setTabResult: (workspaceId, tabId, result) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...ws.tabs[tabId], result, error: null, isDirty: false },
            },
          },
        },
      }
    })
  },

  setTabError: (workspaceId, tabId, error) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...ws.tabs[tabId], error, result: null },
            },
          },
        },
      }
    })
  },

  setTabLoading: (workspaceId, tabId, loading) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...ws.tabs[tabId], loading },
            },
          },
        },
      }
    })
  },

  // Filter operations
  setTabFilters: (workspaceId, tabId, filters) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...ws.tabs[tabId], filters },
            },
          },
        },
      }
    })
  },

  addTabFilter: (workspaceId, tabId, filter) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const filters = [...(tab.filters || []), filter]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...tab, filters },
            },
          },
        },
      }
    })
  },

  updateTabFilter: (workspaceId, tabId, filterId, updates) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const filters = (tab.filters || []).map((f) => (f.id === filterId ? { ...f, ...updates } : f))
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...tab, filters },
            },
          },
        },
      }
    })
  },

  removeTabFilter: (workspaceId, tabId, filterId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const filters = (tab.filters || []).filter((f) => f.id !== filterId)
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...tab, filters },
            },
          },
        },
      }
    })
  },

  clearTabFilters: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: { ...ws.tabs[tabId], filters: [] },
            },
          },
        },
      }
    })
  },

  // Selectors
  getActiveWorkspace: () => {
    const state = get()
    if (!state.activeWorkspaceId) return null
    return state.workspaces[state.activeWorkspaceId] || null
  },

  getActiveTab: () => {
    const ws = get().getActiveWorkspace()
    if (!ws || !ws.activeTabId) return null
    return ws.tabs[ws.activeTabId] || null
  },

  getWorkspaceById: (id) => {
    return get().workspaces[id] || null
  },

  canCreateWorkspace: () => {
    return get().workspaceOrder.length < MAX_WORKSPACES
  },
}))
