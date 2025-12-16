// Workspace core operations: CRUD, connection state, selectors
import type { Connection } from '@/types/connection'
import type { DbType, Workspace } from '@/types/workspace'
import { nanoid } from 'nanoid'
import type { StateCreator } from 'zustand'

import { createDefaultTab, MAX_WORKSPACES, type WorkspaceManagerStore } from './workspace-types'

export interface WorkspaceCoreSlice {
  // State
  workspaces: Record<string, Workspace>
  workspaceOrder: string[]
  activeWorkspaceId: string | null

  // Workspace CRUD
  createWorkspace: (connection: Connection) => string | null
  closeWorkspace: (workspaceId: string) => void
  switchWorkspace: (workspaceId: string) => void

  // Connection state
  setWorkspaceConnected: (workspaceId: string, connected: boolean) => void
  setWorkspaceSchema: (workspaceId: string, schema: string) => void

  // Selectors
  getActiveWorkspace: () => Workspace | null
  getWorkspaceById: (id: string) => Workspace | null
  canCreateWorkspace: () => boolean
}

export const createWorkspaceCoreSlice: StateCreator<WorkspaceManagerStore, [], [], WorkspaceCoreSlice> = (
  set,
  get
) => ({
  // Initial state
  workspaces: {},
  workspaceOrder: [],
  activeWorkspaceId: null,

  createWorkspace: (connection) => {
    const state = get()
    console.log('[WorkspaceManager] createWorkspace called')
    console.log('[WorkspaceManager] Current state:', {
      workspaceCount: state.workspaceOrder.length,
      workspaceIds: state.workspaceOrder,
      activeWorkspaceId: state.activeWorkspaceId,
    })
    if (state.workspaceOrder.length >= MAX_WORKSPACES) {
      console.log('[WorkspaceManager] MAX_WORKSPACES limit reached:', MAX_WORKSPACES)
      return null
    }

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

  getActiveWorkspace: () => {
    const state = get()
    if (!state.activeWorkspaceId) return null
    return state.workspaces[state.activeWorkspaceId] || null
  },

  getWorkspaceById: (id) => {
    return get().workspaces[id] || null
  },

  canCreateWorkspace: () => {
    return get().workspaceOrder.length < MAX_WORKSPACES
  },
})
