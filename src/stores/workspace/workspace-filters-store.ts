// Filter operations: set, add, update, remove, clear filters
import type { TableFilter } from '@/types/workspace'
import type { StateCreator } from 'zustand'

import type { WorkspaceManagerStore } from './workspace-types'

export interface WorkspaceFiltersSlice {
  setTabFilters: (workspaceId: string, tabId: string, filters: TableFilter[]) => void
  addTabFilter: (workspaceId: string, tabId: string, filter: TableFilter) => void
  updateTabFilter: (workspaceId: string, tabId: string, filterId: string, updates: Partial<TableFilter>) => void
  removeTabFilter: (workspaceId: string, tabId: string, filterId: string) => void
  clearTabFilters: (workspaceId: string, tabId: string) => void
}

export const createWorkspaceFiltersSlice: StateCreator<WorkspaceManagerStore, [], [], WorkspaceFiltersSlice> = (
  set
) => ({
  setTabFilters: (workspaceId, tabId, filters) => {
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
                filters,
                pagination: tab.pagination ? { ...tab.pagination, page: 1 } : undefined,
              },
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
              [tabId]: {
                ...tab,
                filters,
                pagination: tab.pagination ? { ...tab.pagination, page: 1 } : undefined,
              },
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
              [tabId]: {
                ...tab,
                filters,
                pagination: tab.pagination ? { ...tab.pagination, page: 1 } : undefined,
              },
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
              [tabId]: {
                ...tab,
                filters,
                pagination: tab.pagination ? { ...tab.pagination, page: 1 } : undefined,
              },
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
                filters: [],
                pagination: tab.pagination ? { ...tab.pagination, page: 1 } : undefined,
              },
            },
          },
        },
      }
    })
  },
})
