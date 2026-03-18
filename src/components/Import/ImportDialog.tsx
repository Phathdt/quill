import { useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Column } from '@/types/database'
import type { ColumnMapping, ImportOptions, ImportPreview, ImportProgress, ImportResult } from '@/types/import'
import { AlertCircle, ArrowRight, Upload } from 'lucide-react'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  tableName: string
  tableColumns: Column[]
  workspaceId: string
  onSuccess: () => void
}

type Step = 'select' | 'mapping' | 'importing' | 'complete'

export function ImportDialog({ isOpen, onClose, tableName, tableColumns, workspaceId, onSuccess }: ImportDialogProps) {
  const [step, setStep] = useState<Step>('select')
  const [filePath, setFilePath] = useState('')
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [skipErrors, setSkipErrors] = useState(true)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Listen for progress events
  useEffect(() => {
    let unlisten: (() => void) | null = null

    const setupListener = async () => {
      unlisten = await listen<ImportProgress>('import-progress', (event) => {
        setProgress(event.payload)
      })
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  const handleSelectFile = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        filters: [
          { name: 'Data Files', extensions: ['csv', 'json'] },
          { name: 'CSV', extensions: ['csv'] },
          { name: 'JSON', extensions: ['json'] },
        ],
      })

      if (selected && typeof selected === 'string') {
        setFilePath(selected)
        const ext = selected.split('.').pop()?.toLowerCase()
        const detectedFileType = ext === 'json' ? 'json' : 'csv'
        setFileType(detectedFileType)

        const previewData = await invoke<ImportPreview>('preview_import_file', {
          filePath: selected,
          fileType: detectedFileType,
        })
        setPreview(previewData)

        // Auto-map columns with matching names
        const autoMappings: ColumnMapping[] = []
        for (const header of previewData.headers) {
          const match = tableColumns.find((c) => c.name.toLowerCase() === header.toLowerCase())
          if (match) {
            autoMappings.push({
              sourceColumn: header,
              targetColumn: match.name,
            })
          }
        }
        setMappings(autoMappings)
        setStep('mapping')
      }
    } catch (e) {
      setError(String(e))
    }
  }

  const handleStartImport = async () => {
    setStep('importing')
    setProgress({ processed: 0, imported: 0, failed: 0 })

    try {
      const importResult = await invoke<ImportResult>('import_data', {
        workspaceId,
        options: {
          filePath,
          fileType,
          tableName,
          columnMappings: mappings,
          skipErrors,
          batchSize: 100,
        } as ImportOptions,
      })

      setResult(importResult)
      setStep('complete')
      onSuccess()
    } catch (e) {
      setError(String(e))
      setStep('complete')
    }
  }

  const updateMapping = (sourceColumn: string, targetColumn: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.sourceColumn === sourceColumn)
      if (existing) {
        if (!targetColumn) {
          return prev.filter((m) => m.sourceColumn !== sourceColumn)
        }
        return prev.map((m) => (m.sourceColumn === sourceColumn ? { ...m, targetColumn } : m))
      }
      return [...prev, { sourceColumn, targetColumn }]
    })
  }

  const handleClose = () => {
    // Reset state
    setStep('select')
    setFilePath('')
    setPreview(null)
    setMappings([])
    setProgress(null)
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Import Data into {tableName}</DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className='py-8 text-center'>
            <Upload className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
            <p className='text-sm text-muted-foreground mb-4'>Select a CSV or JSON file to import</p>
            {error && <div className='mb-4 text-sm text-destructive'>{error}</div>}
            <Button onClick={handleSelectFile}>Select File</Button>
          </div>
        )}

        {step === 'mapping' && preview && (
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              {preview.totalRows} rows found. Map source columns to table columns:
            </p>

            <ScrollArea className='h-[300px]'>
              <div className='space-y-3 pr-4'>
                {preview.headers.map((header, idx) => (
                  <div key={header} className='flex items-center gap-3'>
                    <div className='flex-1'>
                      <span className='text-sm font-mono'>{header}</span>
                      <span className='text-xs text-muted-foreground ml-2'>({preview.detectedTypes[idx]})</span>
                    </div>
                    <ArrowRight className='h-4 w-4 text-muted-foreground' />
                    <Select
                      value={mappings.find((m) => m.sourceColumn === header)?.targetColumn ?? ''}
                      onValueChange={(v) => updateMapping(header, v)}
                    >
                      <SelectTrigger className='w-[200px]'>
                        <SelectValue placeholder='Skip column' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=''>Skip column</SelectItem>
                        {tableColumns.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name} ({col.typeName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className='flex items-center gap-2'>
              <Checkbox checked={skipErrors} onCheckedChange={(checked) => setSkipErrors(checked === true)} />
              <span className='text-sm'>Skip rows with errors</span>
            </div>
          </div>
        )}

        {step === 'importing' && progress && (
          <div className='py-8 space-y-4'>
            <Progress value={(progress.processed / (preview?.totalRows ?? 1)) * 100} />
            <div className='text-center text-sm text-muted-foreground'>
              Processed {progress.processed} of {preview?.totalRows ?? 0} rows
              <br />
              Imported: {progress.imported} | Failed: {progress.failed}
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className='py-8 text-center'>
            {error ? (
              <>
                <AlertCircle className='h-12 w-12 mx-auto mb-4 text-destructive' />
                <p className='text-destructive'>{error}</p>
              </>
            ) : (
              result && (
                <>
                  <div className='text-4xl mb-4'>{result.failedRows === 0 ? '✅' : '⚠️'}</div>
                  <p className='text-lg font-medium'>Import Complete</p>
                  <p className='text-sm text-muted-foreground mt-2'>
                    {result.importedRows} rows imported
                    {result.failedRows > 0 && `, ${result.failedRows} failed`}
                  </p>
                  {result.errors.length > 0 && (
                    <div className='mt-4 max-h-40 overflow-auto text-left'>
                      <p className='text-xs font-medium mb-2'>Errors:</p>
                      <div className='text-xs text-muted-foreground space-y-1'>
                        {result.errors.slice(0, 10).map((err) => (
                          <div key={err.rowNumber}>
                            Row {err.rowNumber}: {err.error}
                          </div>
                        ))}
                        {result.errors.length > 10 && <div>... and {result.errors.length - 10} more errors</div>}
                      </div>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'mapping' && (
            <>
              <Button variant='ghost' onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleStartImport} disabled={mappings.length === 0}>
                Start Import
              </Button>
            </>
          )}
          {step === 'complete' && <Button onClick={handleClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
