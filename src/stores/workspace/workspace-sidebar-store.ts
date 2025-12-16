// Sidebar operations: open/close, row selection, navigation
import type { StateCreator } from 'zustand'

import type { WorkspaceManagerStore } from './workspace-types'

export interface WorkspaceSidebarSlice {
  setSidebarOpen: (workspaceId: string, tabId: string, isOpen: boolean, mode?: 'record' | 'history') => void
  setSidebarRowIndex: (workspaceId: string, tabId: string, index: number | null) => void
  navigateSidebarRow: (workspaceId: string, tabId: string, direction: 'prev' | 'next') => void
}

export const createWorkspaceSidebarSlice: StateCreator<WorkspaceManagerStore, [], [], WorkspaceSidebarSlice> = (
  set
) => ({
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
})
