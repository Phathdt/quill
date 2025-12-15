export interface QueryHistoryEntry {
  id: string
  sql: string
  timestamp: number
  workspaceId: string
  connectionName: string
  executionTimeMs?: number
  rowCount?: number
  error?: string
}
