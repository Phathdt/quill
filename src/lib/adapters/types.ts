/**
 * Provider Adapter Types
 *
 * These types define the interface for database provider adapters,
 * allowing the frontend to work uniformly with different database types.
 */

import type { JsonValue, ProviderType, QueryResult } from '@/types/provider-result'
import type { SshTunnelConfig } from '@/types/ssh'

/**
 * SSL configuration for database connections
 */
export interface SslConfig {
  mode: 'disable' | 'prefer' | 'require' | 'verify-ca' | 'verify-full'
  rootCertPath?: string
  clientCertPath?: string
  clientKeyPath?: string
}

/**
 * Configuration for provider connection
 */
export interface ConnectionOptions {
  connectionString: string
  sslConfig?: SslConfig
  sshConfig?: SshTunnelConfig
}

/**
 * Table structure information
 */
export interface TableStructure {
  tableName: string
  columns: TableColumn[]
  indexes: TableIndex[]
  foreignKeys: ForeignKey[]
}

export interface TableColumn {
  name: string
  dataType: string
  nullable: boolean
  defaultValue: string | null
  isPrimaryKey: boolean
}

export interface TableIndex {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
  indexType: string
  definition: string | null
}

export interface ForeignKey {
  name: string
  column: string
  referencesTable: string
  referencesColumn: string
}

/**
 * Query sample for provider-specific templates
 */
export interface QuerySample {
  label: string
  query: string
  description?: string
}

/**
 * Column-value pair for CRUD operations
 */
export interface ColumnValue {
  column: string
  value: JsonValue
}

/**
 * Provider adapter interface
 * Provides a unified way to interact with different database providers
 */
export interface ProviderAdapter {
  readonly providerType: ProviderType
  readonly paradigm: 'sql' | 'document'

  // Connection
  connect(options: ConnectionOptions): Promise<string>
  disconnect(): Promise<void>
  testConnection(options: ConnectionOptions): Promise<string>
  isConnected(): Promise<boolean>

  // Query execution
  executeQuery(query: string): Promise<QueryResult>
  executeQueryWithCount(query: string, countQuery?: string): Promise<QueryResult>

  // Schema
  listTables(): Promise<string[]>
  getTableStructure(tableName: string): Promise<TableStructure>
  getPrimaryKeys(tableName: string): Promise<string[]>

  // CRUD operations
  insertRow(tableName: string, values: ColumnValue[]): Promise<QueryResult>
  updateRow(tableName: string, primaryKeys: ColumnValue[], updates: ColumnValue[]): Promise<number>
  deleteRow(tableName: string, primaryKeys: ColumnValue[]): Promise<number>
  deleteRows(tableName: string, rows: ColumnValue[][]): Promise<number>

  // Display helpers
  getQueryPlaceholder(): string
  getQuerySamples(): QuerySample[]
  getEditorLanguage(): string
  getIdentifierQuote(): string
}

/**
 * Configuration for creating a provider adapter
 */
export interface ProviderAdapterConfig {
  providerType: ProviderType
  workspaceId: string
}
