import { useMemo } from 'react'

import Editor from '@monaco-editor/react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import type { CellEdit, PendingNewRow } from '@/types/editing'
import { Check, Copy } from 'lucide-react'

interface EditingToolbarProps {
  onSave: () => void
}

interface TableChange {
  tabId: string
  tableName: string
  changes: CellEdit[]
  newRows: PendingNewRow[]
  deletes: number[]
  ddls: string[]
  primaryKeys: string[]
  columns: { name: string }[]
  rows: unknown[][]
}

export function EditingToolbar({ onSave }: EditingToolbarProps) {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const workspaceTabs = activeWorkspace?.tabs
  const showSqlPreview = useUiStore((s) => s.sqlPreviewOpen)
  const setShowSqlPreview = useUiStore((s) => s.setSqlPreviewOpen)

  // Collect all pending changes and new rows from all table tabs in the workspace
  const allTableChanges = useMemo((): TableChange[] => {
    if (!workspaceTabs) return []

    const changes: TableChange[] = []

    for (const tab of Object.values(workspaceTabs)) {
      if (tab.type !== 'table' || !tab.tableName) continue

      const pendingChanges = tab.editingState?.pendingChanges ?? {}
      const changesList = Object.values(pendingChanges) as CellEdit[]
      const pendingNewRows = tab.editingState?.pendingNewRows ?? []
      const pendingDeletes = tab.editingState?.pendingDeletes ?? []

      const pendingDdls = tab.editingState?.pendingDdls ?? []
      if (changesList.length === 0 && pendingNewRows.length === 0 && pendingDeletes.length === 0 && pendingDdls.length === 0) continue

      changes.push({
        tabId: tab.id,
        tableName: tab.tableName,
        changes: changesList,
        newRows: pendingNewRows,
        deletes: pendingDeletes,
        ddls: tab.editingState?.pendingDdls ?? [],
        primaryKeys: tab.editingState?.primaryKeyColumns ?? [],
        columns: tab.result?.columns ?? [],
        rows: tab.result?.rows ?? [],
      })
    }

    return changes
  }, [workspaceTabs])

  const totalPendingChanges = allTableChanges.reduce((sum, tc) => sum + tc.changes.length, 0)
  const totalPendingInserts = allTableChanges.reduce((sum, tc) => sum + tc.newRows.length, 0)
  const totalPendingDeletes = allTableChanges.reduce((sum, tc) => sum + tc.deletes.length, 0)
  const totalPendingDdls = allTableChanges.reduce((sum, tc) => sum + tc.ddls.length, 0)
  const totalPendingCount = totalPendingChanges + totalPendingInserts + totalPendingDeletes + totalPendingDdls

  if (totalPendingCount === 0) return null

  // Generate SQL preview for all pending changes across all tables
  const generateSqlStatements = (): { tableName: string; sql: string; type: 'UPDATE' | 'INSERT' | 'DELETE' }[] => {
    const statements: { tableName: string; sql: string; type: 'UPDATE' | 'INSERT' | 'DELETE' }[] = []

    for (const tableChange of allTableChanges) {
      // Generate UPDATE statements for cell changes
      const changesByRow: Record<number, CellEdit[]> = {}
      for (const change of tableChange.changes) {
        if (!changesByRow[change.rowIndex]) {
          changesByRow[change.rowIndex] = []
        }
        changesByRow[change.rowIndex].push(change)
      }

      for (const [rowIndexStr, changes] of Object.entries(changesByRow)) {
        const rowIndex = parseInt(rowIndexStr, 10)
        const row = tableChange.rows[rowIndex]

        // Build SET clause
        const setClauses = changes.map((c) => `"${c.columnName}" = ${formatSqlValue(c.newValue)}`).join(', ')

        // Build WHERE clause from primary keys
        const whereClauses = tableChange.primaryKeys
          .map((pkCol) => {
            const colIndex = tableChange.columns.findIndex((c) => c.name === pkCol)
            const value = row?.[colIndex]
            return `"${pkCol}" = ${formatSqlValue(value)}`
          })
          .join(' AND ')

        statements.push({
          tableName: tableChange.tableName,
          sql: `UPDATE "public"."${tableChange.tableName}" SET ${setClauses} WHERE ${whereClauses};`,
          type: 'UPDATE',
        })
      }

      // Generate INSERT statements for new rows
      for (const newRow of tableChange.newRows) {
        // Filter out null/undefined values (for auto-generated columns)
        const nonNullEntries = Object.entries(newRow.values).filter(([, v]) => v !== null && v !== undefined)
        if (nonNullEntries.length === 0) continue

        const columns = nonNullEntries.map(([k]) => k)
        const values = nonNullEntries.map(([, v]) => v)

        statements.push({
          tableName: tableChange.tableName,
          sql: `INSERT INTO "public"."${tableChange.tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.map((v) => formatSqlValue(v)).join(', ')});`,
          type: 'INSERT',
        })
      }

      // Include DDL statements from Structure view
      for (const sql of tableChange.ddls) {
        statements.push({ tableName: tableChange.tableName, sql, type: 'UPDATE' })
      }

      // Generate DELETE statements for pending deletes
      for (const rowIndex of tableChange.deletes) {
        const row = tableChange.rows[rowIndex]

        // Build WHERE clause from primary keys
        const whereClauses = tableChange.primaryKeys
          .map((pkCol) => {
            const colIndex = tableChange.columns.findIndex((c) => c.name === pkCol)
            const value = row?.[colIndex]
            return `"${pkCol}" = ${formatSqlValue(value)}`
          })
          .join(' AND ')

        statements.push({
          tableName: tableChange.tableName,
          sql: `DELETE FROM "public"."${tableChange.tableName}" WHERE ${whereClauses};`,
          type: 'DELETE',
        })
      }
    }

    return statements
  }

  const sqlStatements = generateSqlStatements()

  return (
    <>
      {/* SQL Preview Dialog */}
      <Dialog open={showSqlPreview} onOpenChange={setShowSqlPreview}>
        <DialogContent className='max-w-5xl'>
          <DialogHeader>
            <DialogTitle>
              SQL Preview ({sqlStatements.length} statement{sqlStatements.length > 1 ? 's' : ''})
            </DialogTitle>
          </DialogHeader>
          <div className='rounded-md overflow-hidden border border-border'>
            <Editor
              height={Math.min(600, Math.max(300, sqlStatements.length * 100))}
              defaultLanguage='sql'
              value={sqlStatements.map((stmt) => `-- ${stmt.tableName}\n${stmt.sql}`).join('\n\n')}
              theme='vs-dark'
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'none',
                wordWrap: 'on',
                folding: false,
                contextmenu: true,
              }}
            />
          </div>
          <div className='flex justify-end gap-2 mt-4'>
            <Button
              variant='outline'
              onClick={() => {
                const sqlText = sqlStatements.map((stmt) => `-- ${stmt.tableName}\n${stmt.sql}`).join('\n\n')
                navigator.clipboard.writeText(sqlText)
                toast.success('SQL copied to clipboard')
              }}
            >
              <Copy className='h-4 w-4 mr-1' />
              Copy SQL
            </Button>
            <Button variant='ghost' onClick={() => setShowSqlPreview(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setShowSqlPreview(false)
                onSave()
              }}
              className='bg-amber-500 hover:bg-amber-600 text-black'
            >
              <Check className='h-4 w-4 mr-1' />
              Apply All Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Format value for SQL
function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  // Handle objects (JSONB) - stringify and escape
  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value).replace(/'/g, "''")
    return `'${jsonStr}'`
  }
  // Escape single quotes for strings
  const escaped = String(value).replace(/'/g, "''")
  return `'${escaped}'`
}
