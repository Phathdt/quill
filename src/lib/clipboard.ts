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
