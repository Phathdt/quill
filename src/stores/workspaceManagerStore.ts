import type { Connection } from '@/types/connection'
import type { QueryResult } from '@/types/database'
import type { CellEdit } from '@/types/editing'
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
  findTableTab: (workspaceId: string, tableName: string) => string | null
  closeOtherTabs: (workspaceId: string, tabId: string) => void
  closeTabsToRight: (workspaceId: string, tabId: string) => void
  closeAllTabs: (workspaceId: string) => void
  renameTab: (workspaceId: string, tabId: string, name: string) => void

  // Filter operations (table mode only)
  setTabFilters: (workspaceId: string, tabId: string, filters: TableFilter[]) => void
  addTabFilter: (workspaceId: string, tabId: string, filter: TableFilter) => void
  updateTabFilter: (workspaceId: string, tabId: string, filterId: string, updates: Partial<TableFilter>) => void
  removeTabFilter: (workspaceId: string, tabId: string, filterId: string) => void
  clearTabFilters: (workspaceId: string, tabId: string) => void

  // Sidebar operations
  setSidebarOpen: (workspaceId: string, tabId: string, isOpen: boolean, mode?: 'record' | 'history') => void
  setSidebarRowIndex: (workspaceId: string, tabId: string, index: number | null) => void
  navigateSidebarRow: (workspaceId: string, tabId: string, direction: 'prev' | 'next') => void

  // Editing operations (table mode only)
  setPrimaryKeyColumns: (workspaceId: string, tabId: string, columns: string[]) => void
  addPendingChange: (workspaceId: string, tabId: string, change: CellEdit) => void
  removePendingChange: (workspaceId: string, tabId: string, key: string) => void
  clearPendingChanges: (workspaceId: string, tabId: string) => void
  setEditingCell: (workspaceId: string, tabId: string, cell: { rowIndex: number; columnIndex: number } | null) => void

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

  findTableTab: (workspaceId, tableName) => {
    const ws = get().workspaces[workspaceId]
    if (!ws) return null
    for (const tabId of ws.tabOrder) {
      const tab = ws.tabs[tabId]
      if (tab?.type === 'table' && tab.tableName === tableName) {
        return tabId
      }
    }
    return null
  },

  closeOtherTabs: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s

      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: { [tabId]: tab },
            tabOrder: [tabId],
            activeTabId: tabId,
          },
        },
      }
    })
  },

  closeTabsToRight: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws) return s

      const tabIndex = ws.tabOrder.indexOf(tabId)
      if (tabIndex === -1) return s

      const newTabOrder = ws.tabOrder.slice(0, tabIndex + 1)
      const newTabs: Record<string, Tab> = {}
      for (const id of newTabOrder) {
        if (ws.tabs[id]) newTabs[id] = ws.tabs[id]
      }

      const newActiveId = newTabOrder.includes(ws.activeTabId || '')
        ? ws.activeTabId
        : newTabOrder[newTabOrder.length - 1]

      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: newTabs,
            tabOrder: newTabOrder,
            activeTabId: newActiveId,
          },
        },
      }
    })
  },

  closeAllTabs: (workspaceId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws) return s

      const defaultTab = createDefaultTab()
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: { [defaultTab.id]: defaultTab },
            tabOrder: [defaultTab.id],
            activeTabId: defaultTab.id,
          },
        },
      }
    })
  },

  renameTab: (workspaceId, tabId, name) => {
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
              [tabId]: { ...ws.tabs[tabId], name },
            },
          },
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

  // Sidebar operations
  setSidebarOpen: (workspaceId, tabId, isOpen, mode = 'record') => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                sidebarState: {
                  isOpen,
                  mode,
                  selectedRowIndex: tab.sidebarState?.selectedRowIndex ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  setSidebarRowIndex: (workspaceId, tabId, index) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                sidebarState: {
                  isOpen: tab.sidebarState?.isOpen ?? false,
                  mode: tab.sidebarState?.mode ?? 'record',
                  selectedRowIndex: index,
                },
              },
            },
          },
        },
      }
    })
  },

  navigateSidebarRow: (workspaceId, tabId, direction) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const rowCount = tab.result?.rows.length ?? 0
      const currentIndex = tab.sidebarState?.selectedRowIndex ?? 0

      let newIndex = currentIndex
      if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1
      } else if (direction === 'next' && currentIndex < rowCount - 1) {
        newIndex = currentIndex + 1
      }

      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                sidebarState: {
                  ...tab.sidebarState!,
                  selectedRowIndex: newIndex,
                },
              },
            },
          },
        },
      }
    })
  },

  // Editing operations
  setPrimaryKeyColumns: (workspaceId, tabId, columns) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: columns,
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  addPendingChange: (workspaceId, tabId, change) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const key = `${change.rowIndex}-${change.columnName}`
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: {
                    ...(tab.editingState?.pendingChanges ?? {}),
                    [key]: change,
                  },
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  removePendingChange: (workspaceId, tabId, key) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const { [key]: _removed, ...restChanges } = tab.editingState?.pendingChanges ?? {}
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: restChanges,
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  clearPendingChanges: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: {},
                  editingCell: null,
                },
              },
            },
          },
        },
      }
    })
  },

  setEditingCell: (workspaceId, tabId, cell) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  editingCell: cell,
                },
              },
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
