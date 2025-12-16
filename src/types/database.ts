export interface Column {
  name: string
  typeName: string
}

export interface QueryResult {
  columns: Column[]
  rows: (string | number | boolean | null)[][]
  rowsAffected: number
  executionTimeMs: number
  totalCount?: number
}

export interface QueryError {
  message: string
  code?: string
}
