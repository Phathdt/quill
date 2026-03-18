import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'
import { executeQuery, getTableStructure } from '@/lib/tauri'
import {
  changeColumnType,
  createIndex,
  dropIndex,
  renameColumn,
  setColumnDefault,
  setColumnNullable,
} from '@/lib/ddl-generator'
import type { TableColumn, TableIndex, TableStructure } from '@/types/schema'
import type { DbType } from '@/types/workspace'
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react'

/** Extract a human-readable message from any thrown value (including Tauri error objects) */
function extractError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return JSON.stringify(e)
}

interface StructureViewProps {
  workspaceId: string
  tableName: string
  dbType: DbType
}

// ─── Inline editable cell ────────────────────────────────────────────────────
function EditableCell({
  value,
  width,
  mono,
  onCommit,
}: {
  value: string
  width: string
  mono?: boolean
  onCommit: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const start = () => {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    setEditing(false)
    if (draft.trim() !== value) onCommit(draft.trim())
  }

  if (editing) {
    return (
      <div className='flex items-center px-1' style={{ width, minWidth: width }}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className={`h-6 text-xs px-2 py-0 ${mono ? 'font-mono' : ''}`}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center px-3 h-8 text-xs border-r border-border shrink-0 truncate cursor-text hover:bg-accent/40 ${mono ? 'font-mono' : ''}`}
      style={{ width, minWidth: width }}
      onDoubleClick={start}
      title='Double-click to edit'
    >
      {value || <span className='italic text-muted-foreground/50'>NULL</span>}
    </div>
  )
}

// ─── Read-only cell ──────────────────────────────────────────────────────────
function ReadCell({ children, width, mono }: { children: React.ReactNode; width: string; mono?: boolean }) {
  return (
    <div
      className={`flex items-center px-3 h-8 text-xs border-r border-border shrink-0 truncate ${mono ? 'font-mono' : ''}`}
      style={{ width, minWidth: width }}
    >
      {children}
    </div>
  )
}

// ─── Header cell ─────────────────────────────────────────────────────────────
function HeadCell({ children, width }: { children: React.ReactNode; width: string }) {
  return (
    <div
      className='flex items-center px-3 h-8 text-xs font-semibold text-muted-foreground border-r border-border bg-card shrink-0'
      style={{ width, minWidth: width }}
    >
      {children}
    </div>
  )
}

// ─── Columns mini-grid ───────────────────────────────────────────────────────
function ColumnsGrid({
  columns,
  tableName,
  dbType,
  onDdlExecuted,
}: {
  columns: TableColumn[]
  tableName: string
  dbType: DbType
  onDdlExecuted: (sql: string) => Promise<void>
}) {
  const runDdl = async (sql: string) => {
    try {
      await onDdlExecuted(sql)
    } catch (e) {
      toast.error(extractError(e))
    }
  }

  return (
    <div className='flex flex-col border border-border rounded-sm overflow-hidden'>
      <div className='flex border-b border-border bg-card'>
        <HeadCell width='40px'>#</HeadCell>
        <HeadCell width='200px'>column_name</HeadCell>
        <HeadCell width='180px'>data_type</HeadCell>
        <HeadCell width='100px'>is_nullable</HeadCell>
        <HeadCell width='260px'>column_default</HeadCell>
        <HeadCell width='100px'>primary_key</HeadCell>
      </div>
      {columns.map((col, i) => (
        <div key={col.name} className={`flex border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
          <ReadCell width='40px'><span className='text-muted-foreground'>{i + 1}</span></ReadCell>

          <EditableCell
            value={col.name}
            width='200px'
            mono
            onCommit={(newName) =>
              runDdl(renameColumn(dbType, tableName, col.name, newName))
            }
          />

          <EditableCell
            value={col.dataType}
            width='180px'
            mono
            onCommit={(newType) => {
              try {
                runDdl(changeColumnType(dbType, tableName, col.name, newType))
              } catch (e) {
                toast.error(extractError(e))
              }
            }}
          />

          {/* is_nullable: click to toggle */}
          <div
            className='flex items-center px-3 h-8 text-xs border-r border-border shrink-0 cursor-pointer hover:bg-accent/40'
            style={{ width: '100px', minWidth: '100px' }}
            onClick={() => {
              try {
                runDdl(setColumnNullable(dbType, tableName, col.name, !col.nullable))
              } catch (e) {
                toast.error(extractError(e))
              }
            }}
            title='Click to toggle NOT NULL'
          >
            <span className={col.nullable ? 'text-muted-foreground' : 'text-amber-400'}>
              {col.nullable ? 'YES' : 'NO'}
            </span>
          </div>

          <EditableCell
            value={col.defaultValue ?? ''}
            width='260px'
            mono
            onCommit={(val) => {
              try {
                runDdl(setColumnDefault(dbType, tableName, col.name, val === '' ? null : val))
              } catch (e) {
                toast.error(extractError(e))
              }
            }}
          />

          <ReadCell width='100px'>
            <span className={col.isPrimaryKey ? 'text-amber-400 font-semibold' : 'text-muted-foreground'}>
              {col.isPrimaryKey ? 'YES' : 'NO'}
            </span>
          </ReadCell>
        </div>
      ))}
      {columns.length === 0 && (
        <div className='px-3 py-4 text-xs text-muted-foreground'>No columns</div>
      )}
    </div>
  )
}

// ─── Add index form ──────────────────────────────────────────────────────────
function AddIndexForm({
  tableName,
  dbType,
  columnNames,
  onDdlExecuted,
  onCancel,
}: {
  tableName: string
  dbType: DbType
  columnNames: string[]
  onDdlExecuted: (sql: string) => Promise<void>
  onCancel: () => void
}) {
  const [indexName, setIndexName] = useState('')
  const [cols, setCols] = useState('')
  const [unique, setUnique] = useState(false)

  const submit = async () => {
    if (!indexName.trim() || !cols.trim()) {
      toast.error('Index name and columns are required')
      return
    }
    const colList = cols.split(',').map((c) => c.trim()).filter(Boolean)
    try {
      await onDdlExecuted(createIndex(dbType, tableName, indexName.trim(), colList, unique))
      onCancel()
    } catch (e) {
      toast.error(extractError(e))
    }
  }

  return (
    <div className='flex items-center gap-2 px-3 py-2 bg-muted/30 border-t border-border text-xs'>
      <Input
        placeholder='index_name'
        value={indexName}
        onChange={(e) => setIndexName(e.target.value)}
        className='h-6 text-xs px-2 w-40 font-mono'
      />
      <Input
        placeholder='col1, col2'
        value={cols}
        onChange={(e) => setCols(e.target.value)}
        className='h-6 text-xs px-2 w-40 font-mono'
        list='col-suggestions'
      />
      <datalist id='col-suggestions'>
        {columnNames.map((c) => <option key={c} value={c} />)}
      </datalist>
      <label className='flex items-center gap-1 cursor-pointer select-none'>
        <input type='checkbox' checked={unique} onChange={(e) => setUnique(e.target.checked)} />
        UNIQUE
      </label>
      <Button size='sm' className='h-6 px-3 text-xs' onClick={submit}>Create</Button>
      <Button size='sm' variant='ghost' className='h-6 px-3 text-xs' onClick={onCancel}>Cancel</Button>
    </div>
  )
}

// ─── Indexes mini-grid ───────────────────────────────────────────────────────
function IndexesGrid({
  indexes,
  tableName,
  dbType,
  columnNames,
  onDdlExecuted,
}: {
  indexes: TableIndex[]
  tableName: string
  dbType: DbType
  columnNames: string[]
  onDdlExecuted: (sql: string) => Promise<void>
}) {
  const [addingIndex, setAddingIndex] = useState(false)

  return (
    <div className='flex flex-col border border-border rounded-sm overflow-hidden'>
      <div className='flex border-b border-border bg-card'>
        <HeadCell width='280px'>index_name</HeadCell>
        <HeadCell width='120px'>index_algorithm</HeadCell>
        <HeadCell width='90px'>is_unique</HeadCell>
        <HeadCell width='220px'>column_name</HeadCell>
        <HeadCell width='90px'>is_primary</HeadCell>
        <HeadCell width='48px'>{''}</HeadCell>
      </div>
      {indexes.map((idx, i) => (
        <div key={idx.name} className={`flex border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
          <ReadCell width='280px' mono><span className='text-foreground'>{idx.name}</span></ReadCell>
          <ReadCell width='120px'><span className='uppercase text-muted-foreground'>{idx.indexType}</span></ReadCell>
          <ReadCell width='90px'>
            <span className={idx.isUnique ? 'text-emerald-400' : 'text-muted-foreground'}>
              {idx.isUnique ? 'TRUE' : 'FALSE'}
            </span>
          </ReadCell>
          <ReadCell width='220px' mono><span className='text-muted-foreground'>{idx.columns.join(', ')}</span></ReadCell>
          <ReadCell width='90px'>
            <span className={idx.isPrimary ? 'text-amber-400 font-semibold' : 'text-muted-foreground'}>
              {idx.isPrimary ? 'YES' : 'NO'}
            </span>
          </ReadCell>
          {/* Drop button — disabled for primary key */}
          <div className='flex items-center justify-center border-r border-border' style={{ width: 48, minWidth: 48 }}>
            {!idx.isPrimary && (
              <Button
                size='icon'
                variant='ghost'
                className='h-6 w-6 text-muted-foreground hover:text-destructive'
                title='Drop index'
                onClick={() => onDdlExecuted(dropIndex(dbType, tableName, idx.name))}
              >
                <Trash2 className='h-3 w-3' />
              </Button>
            )}
          </div>
        </div>
      ))}

      {addingIndex ? (
        <AddIndexForm
          tableName={tableName}
          dbType={dbType}
          columnNames={columnNames}
          onDdlExecuted={onDdlExecuted}
          onCancel={() => setAddingIndex(false)}
        />
      ) : (
        <div className='flex items-center px-2 py-1.5 border-t border-border bg-card/50'>
          <Button
            size='sm'
            variant='ghost'
            className='h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground'
            onClick={() => setAddingIndex(true)}
          >
            <Plus className='h-3 w-3' />
            Add Index
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function StructureView({ workspaceId, tableName, dbType }: StructureViewProps) {
  const [structure, setStructure] = useState<TableStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStructure(await getTableStructure(workspaceId, tableName))
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [workspaceId, tableName])

  useEffect(() => { load() }, [load])

  // Execute a DDL statement then reload structure
  const handleDdl = async (sql: string) => {
    try {
      await executeQuery(workspaceId, sql)
      toast.success('Schema updated')
      await load()
    } catch (e) {
      toast.error(extractError(e))
    }
  }

  if (loading) {
    return (
      <div className='flex flex-1 items-center justify-center bg-background'>
        <div className='flex items-center gap-2 text-muted-foreground text-sm'>
          <Loader2 className='h-4 w-4 animate-spin text-primary' />
          Loading structure...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-1 items-center justify-center p-4 bg-background'>
        <div className='flex items-center gap-2 text-destructive text-sm'>
          <AlertCircle className='h-4 w-4' />
          {error}
        </div>
      </div>
    )
  }

  if (!structure) return null

  const columnNames = structure.columns.map((c) => c.name)

  return (
    <div className='flex-1 overflow-auto bg-background p-3 flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5'>
          Columns ({structure.columns.length})
          <span className='normal-case font-normal ml-2 text-muted-foreground/60'>— double-click cell to edit</span>
        </p>
        <div className='overflow-x-auto'>
          <ColumnsGrid
            columns={structure.columns}
            tableName={tableName}
            dbType={dbType}
            onDdlExecuted={handleDdl}
          />
        </div>
      </div>

      <div className='flex flex-col gap-1.5'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5'>
          Indexes ({structure.indexes.length})
        </p>
        <div className='overflow-x-auto'>
          <IndexesGrid
            indexes={structure.indexes}
            tableName={tableName}
            dbType={dbType}
            columnNames={columnNames}
            onDdlExecuted={handleDdl}
          />
        </div>
      </div>
    </div>
  )
}
