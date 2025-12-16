import type {
  CommandResult,
  EmptyResult,
  JsonValue,
  ProviderResult,
  ProviderType,
  QueryResultData,
} from '@/types/provider-result'

// Type guards
export function isQueryResult(result: ProviderResult): result is { type: 'query'; data: QueryResultData } {
  return result.type === 'query'
}

export function isCommandResult(result: ProviderResult): result is { type: 'command'; data: CommandResult } {
  return result.type === 'command'
}

export function isEmptyResult(result: ProviderResult): result is { type: 'empty'; data: EmptyResult } {
  return result.type === 'empty'
}

// Provider helpers
export function isSqlProvider(type: ProviderType): boolean {
  return ['postgres', 'sqlite', 'mysql'].includes(type)
}

export function getProviderDisplayName(type: ProviderType): string {
  const names: Record<ProviderType, string> = {
    postgres: 'PostgreSQL',
    sqlite: 'SQLite',
    mysql: 'MySQL',
  }
  return names[type] ?? type
}

export function getProviderColor(type: ProviderType): string {
  const colors: Record<ProviderType, string> = {
    postgres: '#336791', // PostgreSQL blue
    sqlite: '#003B57', // SQLite dark blue
    mysql: '#00758F', // MySQL blue
  }
  return colors[type] ?? '#666666'
}

export function getDefaultPort(type: ProviderType): number {
  const ports: Record<ProviderType, number> = {
    postgres: 5432,
    mysql: 3306,
    sqlite: 0, // N/A - file based
  }
  return ports[type] ?? 0
}

// Infer column type from value
export function inferType(value: JsonValue): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  if (typeof value === 'string') return 'string'
  if (Array.isArray(value)) return 'array'
  return 'object'
}

// Extract value from nested path (e.g., "address.city")
export function extractNestedValue(obj: JsonValue, path: string): JsonValue {
  const parts = path.split('.')
  let current: JsonValue = obj

  for (const part of parts) {
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      current = (current as Record<string, JsonValue>)[part] ?? null
    } else {
      return null
    }
  }

  return current
}
