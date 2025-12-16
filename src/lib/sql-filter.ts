import type { DbType, FilterOperator, SortState, TableFilter } from '@/types/workspace'

/**
 * Escape a value for safe SQL string interpolation
 */
function escapeValue(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * Escape LIKE wildcards in user input to prevent pattern injection
 */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

/**
 * Quote a column name for SQL
 */
function quoteColumn(column: string): string {
  return `"${column.replace(/"/g, '""')}"`
}

/**
 * Convert a filter operator and value(s) to SQL condition
 */
function operatorToSql(
  column: string,
  operator: FilterOperator,
  value: string,
  value2: string | undefined,
  dbType: DbType
): string {
  const col = quoteColumn(column)
  const escapedValue = escapeValue(value)
  const escapedValue2 = value2 ? escapeValue(value2) : ''

  switch (operator) {
    // Comparison operators
    case '=':
      return `${col} = '${escapedValue}'`
    case '<>':
      return `${col} <> '${escapedValue}'`
    case '<':
      return `${col} < '${escapedValue}'`
    case '>':
      return `${col} > '${escapedValue}'`
    case '<=':
      return `${col} <= '${escapedValue}'`
    case '>=':
      return `${col} >= '${escapedValue}'`

    // Set operators
    case 'IN': {
      const inValues = value
        .split(',')
        .map((v) => `'${escapeValue(v.trim())}'`)
        .join(', ')
      return `${col} IN (${inValues})`
    }
    case 'NOT IN': {
      const notInValues = value
        .split(',')
        .map((v) => `'${escapeValue(v.trim())}'`)
        .join(', ')
      return `${col} NOT IN (${notInValues})`
    }

    // Null operators
    case 'IS NULL':
      return `${col} IS NULL`
    case 'IS NOT NULL':
      return `${col} IS NOT NULL`

    // Range operators
    case 'BETWEEN':
      return `${col} BETWEEN '${escapedValue}' AND '${escapedValue2}'`
    case 'NOT BETWEEN':
      return `${col} NOT BETWEEN '${escapedValue}' AND '${escapedValue2}'`

    // LIKE operators
    case 'LIKE':
      return `${col} LIKE '${escapedValue}'`
    case 'ILIKE':
      // SQLite doesn't have ILIKE, use LIKE with LOWER
      if (dbType === 'sqlite') {
        return `LOWER(${col}) LIKE LOWER('${escapedValue}')`
      }
      return `${col} ILIKE '${escapedValue}'`

    // Contains variants - escape wildcards in user input
    case 'CONTAINS': {
      const safeVal = escapeLikeWildcards(escapedValue)
      return `${col} LIKE '%${safeVal}%' ESCAPE '\\'`
    }
    case 'NOT_CONTAINS': {
      const safeVal = escapeLikeWildcards(escapedValue)
      return `${col} NOT LIKE '%${safeVal}%' ESCAPE '\\'`
    }
    case 'CONTAINS_CI': {
      const safeVal = escapeLikeWildcards(escapedValue)
      if (dbType === 'sqlite') {
        return `LOWER(${col}) LIKE LOWER('%${safeVal}%') ESCAPE '\\'`
      }
      return `${col} ILIKE '%${safeVal}%' ESCAPE '\\'`
    }
    case 'NOT_CONTAINS_CI': {
      const safeVal = escapeLikeWildcards(escapedValue)
      if (dbType === 'sqlite') {
        return `LOWER(${col}) NOT LIKE LOWER('%${safeVal}%') ESCAPE '\\'`
      }
      return `${col} NOT ILIKE '%${safeVal}%' ESCAPE '\\'`
    }

    // Prefix/Suffix variants - escape wildcards in user input
    case 'HAS_PREFIX': {
      const safeVal = escapeLikeWildcards(escapedValue)
      return `${col} LIKE '${safeVal}%' ESCAPE '\\'`
    }
    case 'HAS_SUFFIX': {
      const safeVal = escapeLikeWildcards(escapedValue)
      return `${col} LIKE '%${safeVal}' ESCAPE '\\'`
    }
    case 'HAS_PREFIX_CI': {
      const safeVal = escapeLikeWildcards(escapedValue)
      if (dbType === 'sqlite') {
        return `LOWER(${col}) LIKE LOWER('${safeVal}%') ESCAPE '\\'`
      }
      return `${col} ILIKE '${safeVal}%' ESCAPE '\\'`
    }
    case 'HAS_SUFFIX_CI': {
      const safeVal = escapeLikeWildcards(escapedValue)
      if (dbType === 'sqlite') {
        return `LOWER(${col}) LIKE LOWER('%${safeVal}') ESCAPE '\\'`
      }
      return `${col} ILIKE '%${safeVal}' ESCAPE '\\'`
    }

    default:
      return `${col} = '${escapedValue}'`
  }
}

/**
 * Validate filter has required values for its operator
 */
function isFilterValid(filter: TableFilter): boolean {
  const { operator, value, value2 } = filter

  // Null operators don't need values
  if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
    return true
  }

  // BETWEEN requires both values
  if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
    return Boolean(value && value2)
  }

  // IN/NOT IN require non-empty value
  if (operator === 'IN' || operator === 'NOT IN') {
    return Boolean(value && value.trim())
  }

  // Other operators require value
  return Boolean(value)
}

/**
 * Generate WHERE clause from filters
 * Returns empty string if no enabled/valid filters
 */
export function generateWhereClause(filters: TableFilter[], dbType: DbType): string {
  const validFilters = filters.filter((f) => f.enabled && f.column && isFilterValid(f))

  if (validFilters.length === 0) {
    return ''
  }

  const conditions = validFilters.map((f) => operatorToSql(f.column, f.operator, f.value, f.value2, dbType))

  return `WHERE ${conditions.join(' AND ')}`
}

/**
 * Generate ORDER BY clause from sort state
 */
export function generateOrderByClause(sort: SortState | undefined): string {
  if (!sort || !sort.column) {
    return ''
  }
  const col = quoteColumn(sort.column)
  const direction = sort.direction === 'desc' ? 'DESC' : 'ASC'
  return `ORDER BY ${col} ${direction}`
}

/**
 * Generate complete SQL query for a table with filters
 */
export function generateTableQuery(
  tableName: string,
  filters: TableFilter[],
  dbType: DbType,
  limit: number = 100,
  offset: number = 0,
  sort?: SortState
): string {
  const safeTableName = `"${tableName.replace(/"/g, '""')}"`
  const whereClause = generateWhereClause(filters, dbType)
  const orderByClause = generateOrderByClause(sort)

  const parts = [
    'SELECT *',
    `FROM ${safeTableName}`,
    whereClause,
    orderByClause,
    `LIMIT ${limit}`,
    offset > 0 ? `OFFSET ${offset}` : '',
  ].filter(Boolean)

  return parts.join(' ')
}

/**
 * Generate COUNT(*) query for pagination total count
 */
export function generateCountQuery(tableName: string, filters: TableFilter[], dbType: DbType): string {
  const safeTableName = `"${tableName.replace(/"/g, '""')}"`
  const whereClause = generateWhereClause(filters, dbType)

  const parts = ['SELECT COUNT(*)', `FROM ${safeTableName}`, whereClause].filter(Boolean)

  return parts.join(' ')
}
