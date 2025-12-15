import type { QueryResult } from './database'
import type { EditingState } from './editing'

// Filter operators matching TablePlus
export type FilterOperator =
  // Comparison
  | '='
  | '<>'
  | '<'
  | '>'
  | '<='
  | '>='
  // Set
  | 'IN'
  | 'NOT IN'
  // Null
  | 'IS NULL'
  | 'IS NOT NULL'
  // Range
  | 'BETWEEN'
  | 'NOT BETWEEN'
  // Pattern matching
  | 'LIKE'
  | 'ILIKE'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'CONTAINS_CI'
  | 'NOT_CONTAINS_CI'
  | 'HAS_PREFIX'
  | 'HAS_SUFFIX'
  | 'HAS_PREFIX_CI'
  | 'HAS_SUFFIX_CI'

// Single filter condition
export interface TableFilter {
  id: string
  column: string
  operator: FilterOperator
  value: string
  value2?: string // For BETWEEN operator
  enabled: boolean
}

// Sidebar state
export interface SidebarState {
  isOpen: boolean
  mode: 'record' | 'history'
  selectedRowIndex: number | null
}

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
  filters?: TableFilter[] // Only used for type='table'
  sidebarState?: SidebarState
  editingState?: EditingState // Only used for type='table'
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
