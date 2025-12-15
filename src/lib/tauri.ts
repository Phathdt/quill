import { invoke } from '@tauri-apps/api/tauri'

import type { QueryResult } from '@/types/database'

// Single workspace ID for backend - centralized constant
export const WORKSPACE_ID = 'default'

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
