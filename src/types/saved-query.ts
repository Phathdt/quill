export interface SavedQuery {
  id: string
  name: string
  sql: string
  description?: string
  tags: string[]
  connectionType?: 'postgres' | 'sqlite' | 'any' // Limit to specific DB types
  createdAt: string
  updatedAt: string
  isFavorite: boolean
}

export interface SavedQueriesState {
  queries: Record<string, SavedQuery>
  queryOrder: string[] // For sorting
  tags: string[] // All unique tags
  searchQuery: string
  selectedTags: string[]
}
