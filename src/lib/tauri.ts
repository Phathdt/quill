import { invoke } from '@tauri-apps/api/tauri'

import type { QueryResult } from '@/types/database'
import type { TableStructure } from '@/types/schema'

export async function executeQuery(workspaceId: string, sql: string): Promise<QueryResult> {
  return invoke<QueryResult>('execute_query', { workspaceId, sql })
}

export async function connectWorkspace(workspaceId: string, connectionString: string): Promise<string> {
  return invoke<string>('connect_workspace', { workspaceId, connectionString })
}

export async function disconnectWorkspace(workspaceId: string): Promise<void> {
  return invoke('disconnect_workspace', { workspaceId })
}

export async function getWorkspaceConnectionStatus(workspaceId: string): Promise<boolean> {
  return invoke<boolean>('get_workspace_connection_status', { workspaceId })
}

export async function testConnection(connectionString: string): Promise<string> {
  return invoke<string>('test_connection', { connectionString })
}

export async function getTableStructure(workspaceId: string, tableName: string): Promise<TableStructure> {
  return invoke<TableStructure>('get_table_structure', { workspaceId, tableName })
}

export async function getTablesList(workspaceId: string): Promise<string[]> {
  return invoke<string[]>('get_tables_list', { workspaceId })
}
