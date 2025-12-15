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

// Database type enum
export type DbType = 'postgres' | 'sqlite'

// Color mapping for DB types
export const DB_COLORS: Record<DbType, string> = {
  postgres: '#336791', // PostgreSQL blue
  sqlite: '#003B57', // SQLite teal
}

// Single workspace - extends existing Tab structure
export interface Workspace {
  id: string
  connectionId: string
  name: string // Display name (from connection)
  dbType: DbType
  isConnected: boolean
  schema?: string // Current schema (postgres only)
  tabs: Record<string, Tab> // Reuse existing Tab type
  tabOrder: string[]
  activeTabId: string | null
}

// Manager state for all workspaces
export interface WorkspaceManagerState {
  workspaces: Record<string, Workspace>
  workspaceOrder: string[] // For ordering in ActivityBar
  activeWorkspaceId: string | null
}
