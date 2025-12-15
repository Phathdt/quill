import { save } from '@tauri-apps/api/dialog'
import { writeTextFile } from '@tauri-apps/api/fs'

import type { Column } from '@/types/database'

/**
 * Helper to trigger file download - uses Tauri's native dialog
 */
async function downloadFile(
  content: string,
  defaultFilename: string,
  filters: { name: string; extensions: string[] }[]
): Promise<void> {
  try {
    const filePath = await save({
      defaultPath: defaultFilename,
      filters,
    })

    if (filePath) {
      await writeTextFile(filePath, content)
    }
  } catch (error) {
    console.error('Failed to download file:', error)
    throw error
  }
}

/**
 * Escape CSV value and wrap in quotes if needed
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // Wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Export table data to CSV format
 */
export async function exportToCsv(columns: Column[], rows: unknown[][], filename: string): Promise<void> {
  try {
    // Header row
    const header = columns.map((col) => escapeCsvValue(col.name)).join(',')

    // Data rows
    const dataRows = rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))

    // Combine with newlines
    const csv = [header, ...dataRows].join('\n')

    await downloadFile(csv, filename, [{ name: 'CSV', extensions: ['csv'] }])
  } catch (error) {
    console.error('Failed to export CSV:', error)
    throw error
  }
}

/**
 * Export table data to JSON format
 */
export async function exportToJson(columns: Column[], rows: unknown[][], filename: string): Promise<void> {
  try {
    // Convert rows to array of objects
    const data = rows.map((row) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, index) => {
        obj[col.name] = row[index]
      })
      return obj
    })

    const json = JSON.stringify(data, null, 2)

    await downloadFile(json, filename, [{ name: 'JSON', extensions: ['json'] }])
  } catch (error) {
    console.error('Failed to export JSON:', error)
    throw error
  }
}
