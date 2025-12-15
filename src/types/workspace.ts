import type { QueryResult } from './database'

// Tab within workspace - can be query or table browser
export interface Tab {
  id: string
  type: 'query' | 'table'
  name: string
  tableName?: string // only for type='table'
  sql: string
  cursorPosition?: { line: number; column: number }
  result: QueryResult | null
  error: string | null
  loading: boolean
  isDirty: boolean
}

// Single workspace state - 1 connection + multiple tabs
export interface WorkspaceState {
  connectionId: string | null
  isConnected: boolean
  tabs: Record<string, Tab>
  tabOrder: string[]
  activeTabId: string | null
}
