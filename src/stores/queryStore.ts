import type { QueryResult } from '@/types/database'
import { create } from 'zustand'

interface QueryStore {
  sql: string
  result: QueryResult | null
  error: string | null
  loading: boolean
  setSql: (sql: string) => void
  setResult: (result: QueryResult) => void
  setError: (error: string) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useQueryStore = create<QueryStore>((set) => ({
  sql: '',
  result: null,
  error: null,
  loading: false,
  setSql: (sql) => set({ sql }),
  setResult: (result) => set({ result, error: null }),
  setError: (error) => set({ error, result: null }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ sql: '', result: null, error: null }),
}))
