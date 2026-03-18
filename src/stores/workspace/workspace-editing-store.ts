// Editing operations: pending changes, new rows, deletes, cell editing
import type { CellEdit, PendingNewRow } from '@/types/editing'
import type { StateCreator } from 'zustand'

import type { WorkspaceManagerStore } from './workspace-types'

export interface WorkspaceEditingSlice {
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
  addPendingDdl: (workspaceId: string, tabId: string, sql: string) => void
  clearPendingDdls: (workspaceId: string, tabId: string) => void
}

export const createWorkspaceEditingSlice: StateCreator<WorkspaceManagerStore, [], [], WorkspaceEditingSlice> = (
  set
) => ({
  setPrimaryKeyColumns: (workspaceId, tabId, columns) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: columns,
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  addPendingChange: (workspaceId, tabId, change) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const key = `${change.rowIndex}-${change.columnName}`
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: {
                    ...(tab.editingState?.pendingChanges ?? {}),
                    [key]: change,
                  },
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  removePendingChange: (workspaceId, tabId, key) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const { [key]: _removed, ...restChanges } = tab.editingState?.pendingChanges ?? {}
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: restChanges,
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  clearPendingChanges: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: {},
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: null,
                },
              },
            },
          },
        },
      }
    })
  },

  setEditingCell: (workspaceId, tabId, cell) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: cell,
                },
              },
            },
          },
        },
      }
    })
  },

  addPendingNewRows: (workspaceId, tabId, rows) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const existingRows = tab.editingState?.pendingNewRows ?? []
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: [...existingRows, ...rows],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  updatePendingNewRow: (workspaceId, tabId, tempId, columnName, value) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const existingRows = tab.editingState?.pendingNewRows ?? []

      const updatedRows = existingRows.map((row) => {
        if (row.tempId === tempId) {
          return {
            ...row,
            values: {
              ...row.values,
              [columnName]: value,
            },
          }
        }
        return row
      })

      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: updatedRows,
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  clearPendingNewRows: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  addPendingDeletes: (workspaceId, tabId, rowIndices) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      const currentDeletes = tab.editingState?.pendingDeletes ?? []
      const merged = [...new Set([...currentDeletes, ...rowIndices])]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: merged,
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  clearPendingDeletes: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: [],
                  pendingDdls: tab.editingState?.pendingDdls ?? [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  addPendingDdl: (workspaceId, tabId, sql) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: [...(tab.editingState?.pendingDdls ?? []), sql],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },

  clearPendingDdls: (workspaceId, tabId) => {
    set((s) => {
      const ws = s.workspaces[workspaceId]
      if (!ws || !ws.tabs[tabId]) return s
      const tab = ws.tabs[tabId]
      return {
        workspaces: {
          ...s.workspaces,
          [workspaceId]: {
            ...ws,
            tabs: {
              ...ws.tabs,
              [tabId]: {
                ...tab,
                editingState: {
                  primaryKeyColumns: tab.editingState?.primaryKeyColumns ?? [],
                  pendingChanges: tab.editingState?.pendingChanges ?? {},
                  pendingNewRows: tab.editingState?.pendingNewRows ?? [],
                  pendingDeletes: tab.editingState?.pendingDeletes ?? [],
                  pendingDdls: [],
                  editingCell: tab.editingState?.editingCell ?? null,
                },
              },
            },
          },
        },
      }
    })
  },
})
