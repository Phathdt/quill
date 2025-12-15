export interface ImportPreview {
  headers: string[]
  sampleRows: unknown[][]
  totalRows: number
  detectedTypes: string[]
}

export interface ColumnMapping {
  sourceColumn: string
  targetColumn: string
}

export interface ImportOptions {
  filePath: string
  fileType: 'csv' | 'json'
  tableName: string
  columnMappings: ColumnMapping[]
  skipErrors: boolean
  batchSize?: number
}

export interface ImportResult {
  totalRows: number
  importedRows: number
  failedRows: number
  errors: ImportError[]
}

export interface ImportError {
  rowNumber: number
  error: string
}

export interface ImportProgress {
  processed: number
  imported: number
  failed: number
}
