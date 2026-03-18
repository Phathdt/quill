export interface CellEdit {
  rowIndex: number
  columnName: string
  originalValue: unknown
  newValue: unknown
  columnType: string
}

export interface PendingNewRow {
  tempId: string
  values: Record<string, unknown> // columnName -> value
}

export interface EditingState {
  primaryKeyColumns: string[]
  pendingChanges: Record<string, CellEdit> // key: `${rowIndex}-${columnName}`
  pendingNewRows: PendingNewRow[] // New rows to be inserted on save
  pendingDeletes: number[] // Row indices marked for deletion
  pendingDdls: string[] // DDL statements staged from Structure view
  editingCell: { rowIndex: number; columnIndex: number } | null
}

export type EditMode = 'view' | 'edit'

// Row management types (Phase 2)
export interface NewRowState {
  isAdding: boolean
  values: Record<string, unknown>
  errors: Record<string, string>
}

export interface DeleteConfirmation {
  rows: number[]
  isOpen: boolean
}

export interface PrimaryKeyValue {
  column: string
  value: string | number | boolean | null
}
