import { getTablesList, getTableStructure } from '@/lib/tauri'
import type { TableStructure } from '@/types/schema'
import { create } from 'zustand'

interface SchemaCache {
  tables: string[]
  columns: Map<string, TableStructure>
  lastRefresh: number | null
}

interface SchemaStore {
  cache: Record<string, SchemaCache> // workspaceId -> cache
  loading: Record<string, boolean>

  // Actions
  loadSchema: (workspaceId: string) => Promise<void>
  getTableColumns: (workspaceId: string, tableName: string) => Promise<TableStructure | null>
  refreshSchema: (workspaceId: string) => Promise<void>

  // Selectors
  getTables: (workspaceId: string) => string[]
  getCachedColumns: (workspaceId: string, tableName: string) => TableStructure | null
  isLoading: (workspaceId: string) => boolean
}

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  cache: {},
  loading: {},

  loadSchema: async (workspaceId) => {
    const state = get()
    if (state.loading[workspaceId]) return

    set((s) => ({ loading: { ...s.loading, [workspaceId]: true } }))

    try {
      const tables = await getTablesList(workspaceId)
      set((s) => ({
        cache: {
          ...s.cache,
          [workspaceId]: {
            tables,
            columns: s.cache[workspaceId]?.columns ?? new Map(),
            lastRefresh: Date.now(),
          },
        },
        loading: { ...s.loading, [workspaceId]: false },
      }))
    } catch (err) {
      console.error('Failed to load schema:', err)
      set((s) => ({ loading: { ...s.loading, [workspaceId]: false } }))
    }
  },

  getTableColumns: async (workspaceId, tableName) => {
    const state = get()
    const cached = state.cache[workspaceId]?.columns.get(tableName)
    if (cached) return cached

    try {
      const structure = await getTableStructure(workspaceId, tableName)
      set((s) => {
        const wsCache = s.cache[workspaceId] ?? { tables: [], columns: new Map(), lastRefresh: null }
        const newColumns = new Map(wsCache.columns)
        newColumns.set(tableName, structure)
        return {
          cache: {
            ...s.cache,
            [workspaceId]: { ...wsCache, columns: newColumns },
          },
        }
      })
      return structure
    } catch (err) {
      console.error('Failed to load columns:', err)
      return null
    }
  },

  refreshSchema: async (workspaceId) => {
    set((s) => ({
      cache: {
        ...s.cache,
        [workspaceId]: { tables: [], columns: new Map(), lastRefresh: null },
      },
    }))
    await get().loadSchema(workspaceId)
  },

  getTables: (workspaceId) => get().cache[workspaceId]?.tables ?? [],
  getCachedColumns: (workspaceId, tableName) => get().cache[workspaceId]?.columns.get(tableName) ?? null,
  isLoading: (workspaceId) => get().loading[workspaceId] ?? false,
}))
