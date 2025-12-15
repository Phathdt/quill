/**
 * Parse string input to typed value based on SQL column type
 * Used for inline editing and new row insertion
 */
export function parseValue(rawValue: string, typeName: string): unknown {
  const trimmed = rawValue.trim()

  // Handle NULL/empty
  if (trimmed === '' || trimmed.toUpperCase() === 'NULL') {
    return null
  }

  const lowerType = typeName.toLowerCase()

  // Boolean types
  if (lowerType === 'boolean' || lowerType === 'bool') {
    const lower = trimmed.toLowerCase()
    if (lower === 'true' || lower === 't' || lower === '1') return true
    if (lower === 'false' || lower === 'f' || lower === '0') return false
    throw new Error(`Invalid boolean: "${trimmed}"`)
  }

  // Integer types
  if (lowerType.includes('int') || lowerType === 'serial' || lowerType === 'bigserial' || lowerType === 'smallserial') {
    const num = Number.parseInt(trimmed, 10)
    if (Number.isNaN(num)) throw new Error(`Invalid integer: "${trimmed}"`)
    return num
  }

  // Float/Decimal types
  if (
    lowerType.includes('float') ||
    lowerType.includes('real') ||
    lowerType.includes('double') ||
    lowerType.includes('numeric') ||
    lowerType.includes('decimal')
  ) {
    const num = Number.parseFloat(trimmed)
    if (Number.isNaN(num)) throw new Error(`Invalid number: "${trimmed}"`)
    return num
  }

  // JSON types
  if (lowerType === 'json' || lowerType === 'jsonb') {
    try {
      return JSON.parse(trimmed)
    } catch {
      throw new Error(`Invalid JSON: "${trimmed}"`)
    }
  }

  // Default: return as string (text, varchar, char, timestamp, uuid, etc.)
  return trimmed
}

export function formatValue(value: unknown): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return String(value)
  return String(value)
}
