import type { Connection } from '@/types/connection'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConnectionStore {
  connections: Connection[]
  activeId: string | null
  addConnection: (conn: Connection) => void
  setActive: (id: string | null) => void
  removeConnection: (id: string) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set) => ({
      connections: [],
      activeId: null,
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
    }),
    {
      name: 'quill-connections',
    }
  )
)
