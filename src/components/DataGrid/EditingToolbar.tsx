import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { CellEdit, PendingNewRow } from '@/types/editing'
import { Check, Code, X } from 'lucide-react'

interface EditingToolbarProps {
  onSave: () => void
  onDiscard: () => void
}

interface TableChange {
  tabId: string
  tableName: string
  changes: CellEdit[]
  newRows: PendingNewRow[]
  primaryKeys: string[]
  columns: { name: string }[]
  rows: unknown[][]
}

export function EditingToolbar({ onSave, onDiscard }: EditingToolbarProps) {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const workspaceTabs = activeWorkspace?.tabs
  const [showSqlPreview, setShowSqlPreview] = useState(false)

  // Collect all pending changes and new rows from all table tabs in the workspace
  const allTableChanges = useMemo((): TableChange[] => {
    if (!workspaceTabs) return []

    const changes: TableChange[] = []

    for (const tab of Object.values(workspaceTabs)) {
      if (tab.type !== 'table' || !tab.tableName) continue

      const pendingChanges = tab.editingState?.pendingChanges ?? {}
      const changesList = Object.values(pendingChanges) as CellEdit[]
      const pendingNewRows = tab.editingState?.pendingNewRows ?? []

      if (changesList.length === 0 && pendingNewRows.length === 0) continue

      changes.push({
        tabId: tab.id,
        tableName: tab.tableName,
        changes: changesList,
        newRows: pendingNewRows,
        primaryKeys: tab.editingState?.primaryKeyColumns ?? [],
        columns: tab.result?.columns ?? [],
        rows: tab.result?.rows ?? [],
      })
    }

    return changes
  }, [workspaceTabs])

  const totalPendingChanges = allTableChanges.reduce((sum, tc) => sum + tc.changes.length, 0)
  const totalPendingInserts = allTableChanges.reduce((sum, tc) => sum + tc.newRows.length, 0)
  const totalPendingCount = totalPendingChanges + totalPendingInserts

  if (totalPendingCount === 0) return null

  // Generate SQL preview for all pending changes across all tables
  const generateSqlStatements = (): { tableName: string; sql: string; type: 'UPDATE' | 'INSERT' }[] => {
    const statements: { tableName: string; sql: string; type: 'UPDATE' | 'INSERT' }[] = []

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
        const columns = Object.keys(newRow.values)
        const values = Object.values(newRow.values)

        statements.push({
          tableName: tableChange.tableName,
          sql: `INSERT INTO "public"."${tableChange.tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.map((v) => formatSqlValue(v)).join(', ')});`,
          type: 'INSERT',
        })
      }
    }

    return statements
  }

  const sqlStatements = generateSqlStatements()
  const affectedTables = [...new Set(allTableChanges.map((tc) => tc.tableName))]

  return (
    <>
      <div className='flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30'>
        <span className='text-xs text-amber-400'>
          {totalPendingChanges > 0 && `${totalPendingChanges} edit${totalPendingChanges > 1 ? 's' : ''}`}
          {totalPendingChanges > 0 && totalPendingInserts > 0 && ', '}
          {totalPendingInserts > 0 && `${totalPendingInserts} new row${totalPendingInserts > 1 ? 's' : ''}`}
          {affectedTables.length > 1 && (
            <span className='text-muted-foreground ml-1'>
              in {affectedTables.length} tables ({affectedTables.join(', ')})
            </span>
          )}
          {affectedTables.length === 1 && <span className='text-muted-foreground ml-1'>in {affectedTables[0]}</span>}
        </span>
        <div className='flex-1' />

        {/* Clear button */}
        <Button size='sm' variant='ghost' onClick={onDiscard} className='h-6 text-xs text-muted-foreground hover:text-foreground'>
          <X className='h-3 w-3 mr-1' />
          Clear
        </Button>

        {/* View SQL button */}
        <Button
          size='sm'
          variant='ghost'
          onClick={() => setShowSqlPreview(true)}
          className='h-6 text-xs text-muted-foreground hover:text-foreground'
        >
          <Code className='h-3 w-3 mr-1' />
          View SQL
        </Button>

        {/* Apply button */}
        <Button size='sm' onClick={onSave} className='h-6 text-xs bg-amber-500 hover:bg-amber-600 text-black'>
          <Check className='h-3 w-3 mr-1' />
          Apply (Cmd+S)
        </Button>
      </div>

      {/* SQL Preview Dialog */}
      <Dialog open={showSqlPreview} onOpenChange={setShowSqlPreview}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>SQL Preview ({sqlStatements.length} statement{sqlStatements.length > 1 ? 's' : ''})</DialogTitle>
          </DialogHeader>
          <div className='bg-muted/50 rounded-md p-4 max-h-[400px] overflow-auto'>
            <pre className='text-sm font-mono text-foreground whitespace-pre-wrap'>
              {sqlStatements.map((stmt, i) => (
                <div key={i} className='mb-3'>
                  <div className='text-xs text-muted-foreground mb-1'>-- {stmt.tableName}</div>
                  <div>{highlightSql(stmt.sql)}</div>
                </div>
              ))}
            </pre>
          </div>
          <div className='flex justify-end gap-2 mt-4'>
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
  // Escape single quotes
  const escaped = String(value).replace(/'/g, "''")
  return `'${escaped}'`
}

// Simple SQL syntax highlighting
function highlightSql(sql: string): React.ReactNode {
  const keywords = ['UPDATE', 'SET', 'WHERE', 'AND', 'OR', 'NULL', 'TRUE', 'FALSE', 'INSERT', 'INTO', 'VALUES']
  const parts: React.ReactNode[] = []

  let remaining = sql
  let key = 0

  while (remaining.length > 0) {
    let matched = false

    // Check for keywords
    for (const keyword of keywords) {
      if (remaining.toUpperCase().startsWith(keyword) && (remaining.length === keyword.length || !/\w/.test(remaining[keyword.length]))) {
        parts.push(
          <span key={key++} className='text-cyan-400'>
            {remaining.slice(0, keyword.length)}
          </span>
        )
        remaining = remaining.slice(keyword.length)
        matched = true
        break
      }
    }

    if (matched) continue

    // Check for strings (single quotes)
    if (remaining.startsWith("'")) {
      const endQuote = remaining.indexOf("'", 1)
      if (endQuote !== -1) {
        let actualEnd = endQuote
        while (actualEnd < remaining.length - 1 && remaining[actualEnd + 1] === "'") {
          actualEnd = remaining.indexOf("'", actualEnd + 2)
          if (actualEnd === -1) break
        }
        if (actualEnd !== -1) {
          parts.push(
            <span key={key++} className='text-amber-400'>
              {remaining.slice(0, actualEnd + 1)}
            </span>
          )
          remaining = remaining.slice(actualEnd + 1)
          continue
        }
      }
    }

    // Check for numbers
    const numMatch = remaining.match(/^\d+/)
    if (numMatch) {
      parts.push(
        <span key={key++} className='text-emerald-400'>
          {numMatch[0]}
        </span>
      )
      remaining = remaining.slice(numMatch[0].length)
      continue
    }

    // Check for identifiers (quoted)
    if (remaining.startsWith('"')) {
      const endQuote = remaining.indexOf('"', 1)
      if (endQuote !== -1) {
        parts.push(
          <span key={key++} className='text-foreground'>
            {remaining.slice(0, endQuote + 1)}
          </span>
        )
        remaining = remaining.slice(endQuote + 1)
        continue
      }
    }

    // Default: just add the character
    parts.push(<span key={key++}>{remaining[0]}</span>)
    remaining = remaining.slice(1)
  }

  return parts
}
