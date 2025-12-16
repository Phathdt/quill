// Workspace Manager Store - combines all slices into single store
// Provides backward-compatible API via useWorkspaceManagerStore
import { create } from 'zustand'

import { createWorkspaceCoreSlice } from './workspace-core-store'
import { createWorkspaceEditingSlice } from './workspace-editing-store'
import { createWorkspaceFiltersSlice } from './workspace-filters-store'
import { createWorkspaceSidebarSlice } from './workspace-sidebar-store'
import { createWorkspaceTabsSlice } from './workspace-tabs-store'
import type { WorkspaceManagerStore } from './workspace-types'

// Re-export types for convenience
export type { WorkspaceManagerStore } from './workspace-types'
export { MAX_WORKSPACES, createDefaultTab } from './workspace-types'
export type { PaginationState } from '@/types/workspace'
export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/types/workspace'

// Combined store using slice pattern
export const useWorkspaceManagerStore = create<WorkspaceManagerStore>()((...args) => ({
  ...createWorkspaceCoreSlice(...args),
  ...createWorkspaceTabsSlice(...args),
  ...createWorkspaceFiltersSlice(...args),
  ...createWorkspaceSidebarSlice(...args),
  ...createWorkspaceEditingSlice(...args),
}))
