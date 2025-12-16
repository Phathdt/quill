// Tab operations: create, close, switch, update SQL/result/error/loading
import type { QueryResult } from '@/types/database'
import type { Tab } from '@/types/workspace'
import { nanoid } from 'nanoid'
import type { StateCreator } from 'zustand'

import { createDefaultTab, type WorkspaceManagerStore } from './workspace-types'

export interface WorkspaceTabsSlice {
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
  getActiveTab: () => Tab | null
}

export const createWorkspaceTabsSlice: StateCreator<WorkspaceManagerStore, [], [], WorkspaceTabsSlice> = (
  set,
  get
) => ({
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

  getActiveTab: () => {
    const ws = get().getActiveWorkspace()
    if (!ws || !ws.activeTabId) return null
    return ws.tabs[ws.activeTabId] || null
  },
})
