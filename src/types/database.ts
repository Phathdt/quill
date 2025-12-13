export interface Column {
  name: string
  typeName: string
}

export interface QueryResult {
  columns: Column[]
  rows: (string | number | boolean | null)[][]
  rowsAffected: number
  executionTimeMs: number
}

export interface QueryError {
  message: string
  code?: string
}
