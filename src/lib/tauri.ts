import { invoke } from '@tauri-apps/api/tauri'

import type { QueryResult } from '@/types/database'

export async function executeQuery(sql: string): Promise<QueryResult> {
  return invoke('execute_query', { sql })
}

export async function connectDatabase(connectionString: string): Promise<string> {
  return invoke('connect_database', { connectionString })
}
