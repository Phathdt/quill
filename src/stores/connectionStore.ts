import type { Connection, ConnectionGroup } from '@/types/connection'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConnectionStore {
  // Legacy array format for backward compatibility
  connections: Connection[]
  activeId: string | null

  // New group support
  groups: Record<string, ConnectionGroup>
  groupOrder: string[]

  // Connection CRUD
  addConnection: (conn: Connection) => void
  setActive: (id: string | null) => void
  removeConnection: (id: string) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void

  // Group CRUD
  createGroup: (name: string, color?: string) => string
  updateGroup: (id: string, updates: Partial<ConnectionGroup>) => void
  deleteGroup: (id: string) => void
  reorderGroups: (fromIndex: number, toIndex: number) => void

  // Connection-Group management
  moveToGroup: (connectionId: string, groupId: string | null) => void

  // lastUsedAt tracking
  updateLastUsedAt: (id: string) => void

  // Selectors
  getConnectionsByGroup: (groupId: string | null) => Connection[]
  getGroupedConnections: () => { group: ConnectionGroup | null; connections: Connection[] }[]
  getRecentConnections: (limit?: number) => Connection[]
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      connections: [],
      activeId: null,
      groups: {},
      groupOrder: [],

      // Connection CRUD
      addConnection: (conn) =>
        set((s) => ({
          connections: [...s.connections, conn],
        })),
      setActive: (id) => set({ activeId: id }),
      removeConnection: (id) =>
        set((s) => ({
          connections: s.connections.filter((c) => c.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      updateConnection: (id, updates) =>
        set((s) => ({
          connections: s.connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      // Group CRUD
      createGroup: (name, color) => {
        const id = nanoid()
        const group: ConnectionGroup = {
          id,
          name,
          color,
          isExpanded: true,
          order: get().groupOrder.length,
        }
        set((s) => ({
          groups: { ...s.groups, [id]: group },
          groupOrder: [...s.groupOrder, id],
        }))
        return id
      },

      updateGroup: (id, updates) => {
        set((s) => ({
          groups: {
            ...s.groups,
            [id]: { ...s.groups[id], ...updates },
          },
        }))
      },

      deleteGroup: (id) => {
        // Move all connections in this group to ungrouped
        set((s) => {
          const { [id]: _, ...restGroups } = s.groups
          const updatedConnections = s.connections.map((c) => (c.groupId === id ? { ...c, groupId: undefined } : c))
          return {
            groups: restGroups,
            groupOrder: s.groupOrder.filter((gId) => gId !== id),
            connections: updatedConnections,
          }
        })
      },

      reorderGroups: (fromIndex, toIndex) => {
        set((s) => {
          const newOrder = [...s.groupOrder]
          const [moved] = newOrder.splice(fromIndex, 1)
          newOrder.splice(toIndex, 0, moved)
          return { groupOrder: newOrder }
        })
      },

      // Connection-Group management
      moveToGroup: (connectionId, groupId) => {
        set((s) => ({
          connections: s.connections.map((c) => (c.id === connectionId ? { ...c, groupId: groupId ?? undefined } : c)),
        }))
      },

      // lastUsedAt tracking
      updateLastUsedAt: (id) => {
        set((s) => ({
          connections: s.connections.map((c) => (c.id === id ? { ...c, lastUsedAt: Date.now() } : c)),
        }))
      },

      // Selectors
      getConnectionsByGroup: (groupId) => {
        const s = get()
        return s.connections.filter((c) => (groupId === null ? !c.groupId : c.groupId === groupId))
      },

      getGroupedConnections: () => {
        const s = get()

        // Ungrouped first
        const ungrouped = s.connections.filter((c) => !c.groupId)

        const result: { group: ConnectionGroup | null; connections: Connection[] }[] = []

        if (ungrouped.length > 0) {
          result.push({ group: null, connections: ungrouped })
        }

        // Then groups in order
        s.groupOrder.forEach((groupId) => {
          const group = s.groups[groupId]
          const connections = s.connections.filter((c) => c.groupId === groupId)

          if (connections.length > 0 || group) {
            result.push({ group, connections })
          }
        })

        return result
      },

      getRecentConnections: (limit = 5) => {
        const s = get()
        return [...s.connections]
          .filter((c) => c.lastUsedAt)
          .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
          .slice(0, limit)
      },
    }),
    {
      name: 'quill-connections',
      version: 2,
    }
  )
)
