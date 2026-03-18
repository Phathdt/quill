/**
 * SQL Provider Adapter
 *
 * Adapter for SQL databases (PostgreSQL, SQLite, MySQL) using the new provider API.
 */

import { invoke } from '@tauri-apps/api/core'

import type { ProviderType, QueryResult } from '@/types/provider-result'

import type {
  ColumnValue,
  ConnectionOptions,
  ProviderAdapter,
  ProviderAdapterConfig,
  QuerySample,
  TableStructure,
} from './types'

export class SqlAdapter implements ProviderAdapter {
  readonly providerType: ProviderType
  readonly paradigm = 'sql' as const

  private workspaceId: string

  constructor(config: ProviderAdapterConfig) {
    this.providerType = config.providerType
    this.workspaceId = config.workspaceId
  }

  async connect(options: ConnectionOptions): Promise<string> {
    return await invoke<string>('provider_connect', {
      workspaceId: this.workspaceId,
      options: {
        connectionString: options.connectionString,
        sslConfig: options.sslConfig,
      },
    })
  }

  async disconnect(): Promise<void> {
    await invoke('provider_disconnect', { workspaceId: this.workspaceId })
  }

  async testConnection(options: ConnectionOptions): Promise<string> {
    return await invoke<string>('provider_test_connection', {
      options: {
        connectionString: options.connectionString,
        sslConfig: options.sslConfig,
      },
    })
  }

  async isConnected(): Promise<boolean> {
    return await invoke<boolean>('provider_is_connected', {
      workspaceId: this.workspaceId,
    })
  }

  async executeQuery(query: string): Promise<QueryResult> {
    return await invoke<QueryResult>('provider_execute_query', {
      workspaceId: this.workspaceId,
      sql: query,
    })
  }

  async executeQueryWithCount(query: string, countQuery?: string): Promise<QueryResult> {
    return await invoke<QueryResult>('provider_execute_query_with_count', {
      workspaceId: this.workspaceId,
      sql: query,
      countSql: countQuery,
    })
  }

  async listTables(): Promise<string[]> {
    return await invoke<string[]>('provider_get_tables', {
      workspaceId: this.workspaceId,
    })
  }

  async getTableStructure(tableName: string): Promise<TableStructure> {
    return await invoke<TableStructure>('provider_get_table_structure', {
      workspaceId: this.workspaceId,
      tableName,
    })
  }

  async getPrimaryKeys(tableName: string): Promise<string[]> {
    return await invoke<string[]>('provider_get_primary_key', {
      workspaceId: this.workspaceId,
      tableName,
    })
  }

  async insertRow(tableName: string, values: ColumnValue[]): Promise<QueryResult> {
    return await invoke<QueryResult>('provider_insert_row', {
      workspaceId: this.workspaceId,
      tableName,
      values,
    })
  }

  async updateRow(tableName: string, primaryKeys: ColumnValue[], updates: ColumnValue[]): Promise<number> {
    return await invoke<number>('provider_update_row', {
      workspaceId: this.workspaceId,
      tableName,
      primaryKeys,
      updates,
    })
  }

  async deleteRow(tableName: string, primaryKeys: ColumnValue[]): Promise<number> {
    return await invoke<number>('provider_delete_row', {
      workspaceId: this.workspaceId,
      tableName,
      primaryKeys,
    })
  }

  async deleteRows(tableName: string, rows: ColumnValue[][]): Promise<number> {
    return await invoke<number>('provider_delete_rows', {
      workspaceId: this.workspaceId,
      tableName,
      rows,
    })
  }

  getQueryPlaceholder(): string {
    return 'SELECT * FROM table_name LIMIT 100;'
  }

  getQuerySamples(): QuerySample[] {
    const samples: QuerySample[] = [
      {
        label: 'Select all',
        query: 'SELECT * FROM table_name LIMIT 100;',
        description: 'Fetch all rows with limit',
      },
      {
        label: 'Count rows',
        query: 'SELECT COUNT(*) FROM table_name;',
        description: 'Count total rows in table',
      },
      {
        label: 'Describe table',
        query: this.getDescribeQuery(),
        description: 'Show table structure',
      },
    ]

    // Provider-specific samples
    if (this.providerType === 'mysql') {
      samples.push({
        label: 'Show tables',
        query: 'SHOW TABLES;',
        description: 'List all tables',
      })
      samples.push({
        label: 'Show databases',
        query: 'SHOW DATABASES;',
        description: 'List all databases',
      })
    }

    return samples
  }

  private getDescribeQuery(): string {
    switch (this.providerType) {
      case 'postgres':
        return "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'table_name';"
      case 'sqlite':
        return "PRAGMA table_info('table_name');"
      case 'mysql':
        return 'DESCRIBE table_name;'
      default:
        return ''
    }
  }

  getEditorLanguage(): string {
    return 'sql'
  }

  getIdentifierQuote(): string {
    switch (this.providerType) {
      case 'mysql':
        return '`' // MySQL uses backticks
      default:
        return '"' // PostgreSQL, SQLite use double quotes
    }
  }
}
