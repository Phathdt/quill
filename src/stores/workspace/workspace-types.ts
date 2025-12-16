// Workspace store shared types and utilities
import { MAX_WORKSPACES } from '@/lib/const'
import type { Connection } from '@/types/connection'
import type { QueryResult } from '@/types/database'
import type { CellEdit, PendingNewRow } from '@/types/editing'
import type { PaginationState, SortState, Tab, TableFilter, Workspace, WorkspaceManagerState } from '@/types/workspace'
import { nanoid } from 'nanoid'

// Re-export types for convenience
export type { CellEdit, PendingNewRow } from '@/types/editing'
export type { PaginationState, Tab, TableFilter, Workspace, WorkspaceManagerState } from '@/types/workspace'
export type { Connection }
export type { QueryResult }

// Re-export constant for backward compatibility
export { MAX_WORKSPACES }

// Helper: create default tab for new workspace
export function createDefaultTab(): Tab {
  return {
    id: nanoid(),
    type: 'query',
    name: 'SQL Query',
    sql: '',
    result: null,
    error: null,
    loading: false,
    isDirty: false,
  }
}

// Store interface - shared across all workspace stores
export interface WorkspaceManagerStore extends WorkspaceManagerState {
  // Workspace CRUD
  createWorkspace: (connection: Connection) => string | null
  closeWorkspace: (workspaceId: string) => void
  switchWorkspace: (workspaceId: string) => void

  // Connection state
  setWorkspaceConnected: (workspaceId: string, connected: boolean) => void
  setWorkspaceSchema: (workspaceId: string, schema: string) => void

  // Tab operations (scoped to workspace)
  createTab: (workspaceId: string, type: 'query' | 'table', name: string, tableName?: string) => string
  closeTab: (workspaceId: string, tabId: string) => void
  switchTab: (workspaceId: string, tabId: string) => void
  setTabSql: (workspaceId: string, tabId: string, sql: string) => void
  setTabResult: (workspaceId: string, tabId: string, result: QueryResult) => void
  setTabError: (workspaceId: string, tabId: string, error: string | null) => void
  setTabLoading: (workspaceId: string, tabId: string, loading: boolean) => void
  findTableTab: (workspaceId: string, tableName: string) => string | null
  closeOtherTabs: (workspaceId: string, tabId: string) => void
  closeTabsToRight: (workspaceId: string, tabId: string) => void
  closeAllTabs: (workspaceId: string) => void
  renameTab: (workspaceId: string, tabId: string, name: string) => void
  setTabPagination: (workspaceId: string, tabId: string, pagination: Partial<PaginationState>) => void
  resetTabPagination: (workspaceId: string, tabId: string) => void
  setTabSort: (workspaceId: string, tabId: string, sort: SortState | undefined) => void

  // Filter operations (table mode only)
  setTabFilters: (workspaceId: string, tabId: string, filters: TableFilter[]) => void
  addTabFilter: (workspaceId: string, tabId: string, filter: TableFilter) => void
  updateTabFilter: (workspaceId: string, tabId: string, filterId: string, updates: Partial<TableFilter>) => void
  removeTabFilter: (workspaceId: string, tabId: string, filterId: string) => void
  clearTabFilters: (workspaceId: string, tabId: string) => void

  // Sidebar operations
  setSidebarOpen: (workspaceId: string, tabId: string, isOpen: boolean, mode?: 'record' | 'history') => void
  setSidebarRowIndex: (workspaceId: string, tabId: string, index: number | null) => void
  navigateSidebarRow: (workspaceId: string, tabId: string, direction: 'prev' | 'next') => void

  // Editing operations (table mode only)
  setPrimaryKeyColumns: (workspaceId: string, tabId: string, columns: string[]) => void
  addPendingChange: (workspaceId: string, tabId: string, change: CellEdit) => void
  removePendingChange: (workspaceId: string, tabId: string, key: string) => void
  clearPendingChanges: (workspaceId: string, tabId: string) => void
  setEditingCell: (workspaceId: string, tabId: string, cell: { rowIndex: number; columnIndex: number } | null) => void
  addPendingNewRows: (workspaceId: string, tabId: string, rows: PendingNewRow[]) => void
  updatePendingNewRow: (workspaceId: string, tabId: string, tempId: string, columnName: string, value: unknown) => void
  clearPendingNewRows: (workspaceId: string, tabId: string) => void
  addPendingDeletes: (workspaceId: string, tabId: string, rowIndices: number[]) => void
  clearPendingDeletes: (workspaceId: string, tabId: string) => void

  // Selectors
  getActiveWorkspace: () => Workspace | null
  getActiveTab: () => Tab | null
  getWorkspaceById: (id: string) => Workspace | null
  canCreateWorkspace: () => boolean
}
