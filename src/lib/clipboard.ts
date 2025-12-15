import type { Column } from '@/types/database'

/**
 * Format value for clipboard (handle null/undefined)
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true
      } else if (char === delimiter) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }

  result.push(current)
  return result
}

/**
 * Detect delimiter (comma, tab, or semicolon)
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || ''
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length

  if (tabCount >= commaCount && tabCount >= semicolonCount) return '\t'
  if (semicolonCount > commaCount) return ';'
  return ','
}

/**
 * Parse CSV/TSV text into rows
 */
export function parseCSV(text: string): string[][] {
  const delimiter = detectDelimiter(text)
  const lines = text.trim().split(/\r?\n/)
  return lines.map((line) => parseCSVLine(line, delimiter))
}

/**
 * Read clipboard and parse as CSV
 */
export async function readClipboardAsCSV(): Promise<string[][] | null> {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) return null
    return parseCSV(text)
  } catch (error) {
    console.error('Failed to read clipboard:', error)
    return null
  }
}

/**
 * Copy single cell value to clipboard
 */
export async function copyCellToClipboard(value: unknown): Promise<boolean> {
  try {
    const text = formatValue(value)
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy cell to clipboard:', error)
    return false
  }
}

/**
 * Copy entire row to clipboard as tab-separated values
 */
export async function copyRowToClipboard(row: unknown[]): Promise<boolean> {
  try {
    const text = row.map((cell) => formatValue(cell)).join('\t')
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy row to clipboard:', error)
    return false
  }
}

/**
 * Copy multiple rows to clipboard as tab-separated values with header
 */
export async function copyRowsToClipboard(rows: unknown[][], columns: Column[]): Promise<boolean> {
  try {
    // Header row
    const header = columns.map((col) => col.name).join('\t')

    // Data rows
    const dataRows = rows.map((row) => row.map((cell) => formatValue(cell)).join('\t'))

    // Combine with newlines
    const text = [header, ...dataRows].join('\n')

    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy rows to clipboard:', error)
    return false
  }
}

/**
 * Escape value for CSV (RFC 4180)
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Quote if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Format rows as CSV (RFC 4180 compliant)
 */
export function formatAsCSV(rows: unknown[][], columns: Column[]): string {
  const header = columns.map(col => escapeCSVValue(col.name)).join(',')
  const dataRows = rows.map(row =>
    row.map(cell => escapeCSVValue(cell)).join(',')
  )
  return [header, ...dataRows].join('\n')
}

/**
 * Copy rows as CSV to clipboard
 */
export async function copyAsCSV(rows: unknown[][], columns: Column[]): Promise<boolean> {
  try {
    const csv = formatAsCSV(rows, columns)
    await navigator.clipboard.writeText(csv)
    return true
  } catch (error) {
    console.error('Failed to copy as CSV:', error)
    return false
  }
}

/**
 * Format rows as JSON array of objects
 */
export function formatAsJSON(rows: unknown[][], columns: Column[]): string {
  const objects = rows.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, idx) => {
      obj[col.name] = row[idx]
    })
    return obj
  })
  return JSON.stringify(objects, null, 2)
}

/**
 * Copy rows as JSON to clipboard
 */
export async function copyAsJSON(rows: unknown[][], columns: Column[]): Promise<boolean> {
  try {
    const json = formatAsJSON(rows, columns)
    await navigator.clipboard.writeText(json)
    return true
  } catch (error) {
    console.error('Failed to copy as JSON:', error)
    return false
  }
}
