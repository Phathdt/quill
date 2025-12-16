// Provider types matching Rust backend
export type ProviderType = 'postgres' | 'sqlite' | 'mysql'
export type DatabaseParadigm = 'sql' | 'document'

// Discriminated union for provider results
export type ProviderResult =
  | { type: 'query'; data: QueryResultData }
  | { type: 'command'; data: CommandResult }
  | { type: 'empty'; data: EmptyResult }

export interface QueryResultData {
  columns: ColumnInfo[]
  rows: JsonValue[][]
  totalRows: number
  executionTimeMs: number
  providerType: ProviderType
  totalCount?: number | null
}

export interface ColumnInfo {
  name: string
  typeName: string
  nullable?: boolean | null
  isPrimaryKey?: boolean | null
}

export interface CommandResult {
  rowsAffected: number
  executionTimeMs: number
  providerType: ProviderType
  message?: string | null
}

export interface EmptyResult {
  executionTimeMs: number
  providerType: ProviderType
  message?: string | null
}

export interface ConnectionInfo {
  providerType: ProviderType
  paradigm: DatabaseParadigm
  displayName: string
  version?: string | null
  databaseName?: string | null
}

// JSON value type
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// Legacy QueryResult type for backward compatibility
export interface QueryResult {
  columns: { name: string; typeName: string }[]
  rows: JsonValue[][]
  rowsAffected: number
  executionTimeMs: number
  totalCount?: number | null
}
