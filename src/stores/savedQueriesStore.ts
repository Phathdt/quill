import type { SavedQueriesState, SavedQuery } from '@/types/saved-query'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SavedQueriesStore extends SavedQueriesState {
  // CRUD
  saveQuery: (query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateQuery: (id: string, updates: Partial<SavedQuery>) => void
  deleteQuery: (id: string) => void
  duplicateQuery: (id: string) => string

  // Organization
  toggleFavorite: (id: string) => void
  addTag: (id: string, tag: string) => void
  removeTag: (id: string, tag: string) => void

  // Search & Filter
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[]) => void

  // Selectors
  getFilteredQueries: () => SavedQuery[]
  getQueryById: (id: string) => SavedQuery | null

  // Import/Export
  exportQueries: () => string
  importQueries: (json: string) => number
}

export const useSavedQueriesStore = create<SavedQueriesStore>()(
  persist(
    (set, get) => ({
      queries: {},
      queryOrder: [],
      tags: [],
      searchQuery: '',
      selectedTags: [],

      saveQuery: (query) => {
        const id = nanoid()
        const now = new Date().toISOString()
        const newQuery: SavedQuery = {
          ...query,
          id,
          createdAt: now,
          updatedAt: now,
        }

        set((s) => {
          // Update tags list
          const newTags = [...new Set([...s.tags, ...query.tags])]
          return {
            queries: { ...s.queries, [id]: newQuery },
            queryOrder: [id, ...s.queryOrder],
            tags: newTags,
          }
        })

        return id
      },

      updateQuery: (id, updates) => {
        set((s) => {
          const query = s.queries[id]
          if (!query) return s

          const updatedQuery = {
            ...query,
            ...updates,
            updatedAt: new Date().toISOString(),
          }

          // Update tags list
          const allTags = Object.values({ ...s.queries, [id]: updatedQuery }).flatMap((q) => q.tags)
          const uniqueTags = [...new Set(allTags)]

          return {
            queries: { ...s.queries, [id]: updatedQuery },
            tags: uniqueTags,
          }
        })
      },

      deleteQuery: (id) => {
        set((s) => {
          const { [id]: _removed, ...restQueries } = s.queries
          const newOrder = s.queryOrder.filter((qId) => qId !== id)

          // Update tags list
          const allTags = Object.values(restQueries).flatMap((q) => q.tags)
          const uniqueTags = [...new Set(allTags)]

          return {
            queries: restQueries,
            queryOrder: newOrder,
            tags: uniqueTags,
          }
        })
      },

      duplicateQuery: (id) => {
        const query = get().queries[id]
        if (!query) return ''

        return get().saveQuery({
          name: `${query.name} (copy)`,
          sql: query.sql,
          description: query.description,
          tags: query.tags,
          connectionType: query.connectionType,
          isFavorite: false,
        })
      },

      toggleFavorite: (id) => {
        set((s) => {
          const query = s.queries[id]
          if (!query) return s
          return {
            queries: {
              ...s.queries,
              [id]: { ...query, isFavorite: !query.isFavorite },
            },
          }
        })
      },

      addTag: (id, tag) => {
        set((s) => {
          const query = s.queries[id]
          if (!query || query.tags.includes(tag)) return s
          return {
            queries: {
              ...s.queries,
              [id]: { ...query, tags: [...query.tags, tag] },
            },
            tags: [...new Set([...s.tags, tag])],
          }
        })
      },

      removeTag: (id, tag) => {
        set((s) => {
          const query = s.queries[id]
          if (!query) return s
          const updatedQuery = {
            ...query,
            tags: query.tags.filter((t) => t !== tag),
          }

          // Check if tag is still used
          const allTags = Object.values({ ...s.queries, [id]: updatedQuery }).flatMap((q) => q.tags)
          const uniqueTags = [...new Set(allTags)]

          return {
            queries: { ...s.queries, [id]: updatedQuery },
            tags: uniqueTags,
          }
        })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      setSelectedTags: (tags) => {
        set({ selectedTags: tags })
      },

      getFilteredQueries: () => {
        const s = get()
        return s.queryOrder
          .map((id) => s.queries[id])
          .filter((q) => {
            // Search filter
            if (s.searchQuery) {
              const search = s.searchQuery.toLowerCase()
              const matchesName = q.name.toLowerCase().includes(search)
              const matchesSql = q.sql.toLowerCase().includes(search)
              const matchesDesc = q.description?.toLowerCase().includes(search)
              if (!matchesName && !matchesSql && !matchesDesc) return false
            }

            // Tag filter
            if (s.selectedTags.length > 0) {
              if (!s.selectedTags.some((tag) => q.tags.includes(tag))) return false
            }

            return true
          })
          .sort((a, b) => {
            // Favorites first, then by updatedAt
            if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })
      },

      getQueryById: (id) => get().queries[id] ?? null,

      exportQueries: () => {
        const s = get()
        const queries = s.queryOrder.map((id) => s.queries[id])
        return JSON.stringify(queries, null, 2)
      },

      importQueries: (json) => {
        try {
          const queries: SavedQuery[] = JSON.parse(json)
          let imported = 0

          queries.forEach((q) => {
            if (q.name && q.sql) {
              get().saveQuery({
                name: q.name,
                sql: q.sql,
                description: q.description,
                tags: q.tags ?? [],
                connectionType: q.connectionType,
                isFavorite: q.isFavorite ?? false,
              })
              imported++
            }
          })

          return imported
        } catch {
          return 0
        }
      },
    }),
    {
      name: 'quill-saved-queries',
      version: 1,
    }
  )
)
