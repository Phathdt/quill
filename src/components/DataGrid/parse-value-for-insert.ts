/**
 * Parse CSV/clipboard value for INSERT operation
 * Handles empty strings, nulls, and type conversion
 */
export function parseValueForInsert(value: string, columnType: string): unknown {
  const trimmed = value.trim()
  const lowerType = columnType.toLowerCase()

  // Handle empty/null values
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === '\\n') {
    return null
  }

  // Boolean
  if (lowerType.includes('bool')) {
    const lower = trimmed.toLowerCase()
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 't'
  }

  // Integer types
  if (lowerType.includes('int') || lowerType === 'serial' || lowerType === 'bigserial') {
    const num = parseInt(trimmed, 10)
    return isNaN(num) ? null : num
  }

  // Float/decimal types
  if (
    lowerType.includes('float') ||
    lowerType.includes('double') ||
    lowerType.includes('numeric') ||
    lowerType.includes('decimal') ||
    lowerType.includes('real')
  ) {
    const num = parseFloat(trimmed)
    return isNaN(num) ? null : num
  }

  // JSON/JSONB - must parse to object for PostgreSQL
  if (lowerType.includes('json')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Return as-is - will fail at DB level if invalid
      return trimmed
    }
  }

  // Default: return as string
  return trimmed
}
