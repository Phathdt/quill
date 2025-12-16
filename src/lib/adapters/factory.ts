/**
 * Provider Adapter Factory
 *
 * Creates the appropriate adapter based on provider type.
 */

import type { ProviderType } from '@/types/provider-result'

import { SqlAdapter } from './sql-adapter'
import type { ProviderAdapter, ProviderAdapterConfig } from './types'

const SQL_PROVIDERS: ProviderType[] = ['postgres', 'sqlite', 'mysql']

/**
 * Create a provider adapter based on configuration
 */
export function createProviderAdapter(config: ProviderAdapterConfig): ProviderAdapter {
  if (SQL_PROVIDERS.includes(config.providerType)) {
    return new SqlAdapter(config)
  }

  throw new Error(`Unsupported provider type: ${config.providerType}`)
}

/**
 * Check if a provider type is SQL-based
 */
export function isSqlProvider(type: ProviderType): boolean {
  return SQL_PROVIDERS.includes(type)
}

/**
 * Get display name for a provider type
 */
export function getProviderDisplayName(type: ProviderType): string {
  const names: Record<ProviderType, string> = {
    postgres: 'PostgreSQL',
    sqlite: 'SQLite',
    mysql: 'MySQL',
  }
  return names[type] ?? type
}

/**
 * Get brand color for a provider type
 */
export function getProviderColor(type: ProviderType): string {
  const colors: Record<ProviderType, string> = {
    postgres: '#336791', // PostgreSQL blue
    sqlite: '#003B57', // SQLite dark blue
    mysql: '#00758F', // MySQL blue/teal
  }
  return colors[type] ?? '#666666'
}

/**
 * Get icon name for a provider type
 */
export function getProviderIcon(type: ProviderType): string {
  const icons: Record<ProviderType, string> = {
    postgres: 'database-postgres',
    sqlite: 'database-sqlite',
    mysql: 'database-mysql',
  }
  return icons[type] ?? 'database'
}

/**
 * Get default port for a provider type
 */
export function getDefaultPort(type: ProviderType): number {
  const ports: Record<ProviderType, number> = {
    postgres: 5432,
    mysql: 3306,
    sqlite: 0, // N/A - file based
  }
  return ports[type] ?? 0
}

/**
 * Detect provider type from connection string
 */
export function detectProviderType(connectionString: string): ProviderType | null {
  if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
    return 'postgres'
  }
  if (connectionString.startsWith('mysql://')) {
    return 'mysql'
  }
  if (
    connectionString.startsWith('sqlite://') ||
    connectionString.endsWith('.db') ||
    connectionString.endsWith('.sqlite') ||
    connectionString.endsWith('.sqlite3')
  ) {
    return 'sqlite'
  }
  return null
}

/**
 * Build connection string from parts
 */
export function buildConnectionString(params: {
  providerType: ProviderType
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  filePath?: string
}): string {
  const { providerType, host, port, database, username, password, filePath } = params

  switch (providerType) {
    case 'postgres': {
      const auth = username ? `${username}${password ? `:${password}` : ''}@` : ''
      const hostPart = host ?? 'localhost'
      const portPart = port ? `:${port}` : ':5432'
      const dbPart = database ? `/${database}` : '/postgres'
      return `postgresql://${auth}${hostPart}${portPart}${dbPart}`
    }

    case 'mysql': {
      const auth = username ? `${username}${password ? `:${password}` : ''}@` : ''
      const hostPart = host ?? 'localhost'
      const portPart = port ? `:${port}` : ':3306'
      const dbPart = database ? `/${database}` : ''
      return `mysql://${auth}${hostPart}${portPart}${dbPart}`
    }

    case 'sqlite': {
      return filePath ?? ':memory:'
    }

    default:
      throw new Error(`Unsupported provider type: ${providerType}`)
  }
}
