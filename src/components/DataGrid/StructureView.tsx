import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'
import { getTableStructure } from '@/lib/tauri'
import {
  changeColumnType,
  createIndex,
  dropIndex,
  renameColumn,
  setColumnDefault,
  setColumnNullable,
} from '@/lib/ddl-generator'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import type { TableColumn, TableIndex, TableStructure } from '@/types/schema'
import type { DbType } from '@/types/workspace'
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react'

/**
 * Normalize PostgreSQL canonical type names to common SQL aliases.
 * e.g. "character varying(36)" → "varchar(36)", "time with time zone" → "timetz"
 */
function normalizePgType(t: string): string {
  return t
    .replace(/^character varying(\(.+\))?$/, (_, p) => `varchar${p ?? ''}`)
    .replace(/^character(\(.+\))?$/, (_, p) => `char${p ?? ''}`)
    .replace(/^timestamp with time zone$/, 'timestamptz')
    .replace(/^timestamp without time zone$/, 'timestamp')
    .replace(/^time with time zone$/, 'timetz')
    .replace(/^time without time zone$/, 'time')
    .replace(/^double precision$/, 'float8')
    .replace(/^boolean$/, 'bool')
}

/** Extract a human-readable message from any thrown value (including Tauri error objects) */
function extractError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    if ('message' in e) return String((e as { message: unknown }).message)
    // Tauri error format: { Database: "..." } | { Io: "..." } | { Other: "..." }
    const keys = Object.keys(e as object)
    if (keys.length === 1) {
      const val = (e as Record<string, unknown>)[keys[0]]
      if (typeof val === 'string') return val
    }
  }
  return JSON.stringify(e)
}

// Callback type: add a pending DDL + optimistic update function
type OnAddPending = (sql: string, apply: (s: TableStructure) => TableStructure) => void

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
  const [localDraft, setLocalDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const start = () => {
    setLocalDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    setEditing(false)
    if (localDraft.trim() !== value) onCommit(localDraft.trim())
  }

  if (editing) {
    return (
      <div className='flex items-center px-1' style={{ width, minWidth: width }}>
        <Input
          ref={inputRef}
          value={localDraft}
          onChange={(e) => setLocalDraft(e.target.value)}
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
  onAddPending,
}: {
  columns: TableColumn[]
  tableName: string
  dbType: DbType
  onAddPending: OnAddPending
}) {
  const displayType = (t: string) => dbType === 'postgres' ? normalizePgType(t) : t
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
            onCommit={(newName) => {
              try {
                onAddPending(
                  renameColumn(dbType, tableName, col.name, newName),
                  (s) => ({ ...s, columns: s.columns.map((c) => c.name === col.name ? { ...c, name: newName } : c) })
                )
              } catch (e) { toast.error(extractError(e)) }
            }}
          />

          <EditableCell
            value={displayType(col.dataType)}
            width='180px'
            mono
            onCommit={(newType) => {
              try {
                onAddPending(
                  changeColumnType(dbType, tableName, col.name, newType),
                  (s) => ({ ...s, columns: s.columns.map((c) => c.name === col.name ? { ...c, dataType: newType } : c) })
                )
              } catch (e) { toast.error(extractError(e)) }
            }}
          />

          {/* is_nullable: select YES/NO (disabled for PK columns) */}
          <div className='flex items-center px-2 h-8 border-r border-border shrink-0' style={{ width: '100px', minWidth: '100px' }}>
            {col.isPrimaryKey ? (
              <span className='text-xs text-amber-400 px-1'>NO</span>
            ) : (
              <select
                value={col.nullable ? 'YES' : 'NO'}
                className='w-full h-6 text-xs bg-transparent border-0 outline-none cursor-pointer hover:bg-accent/40 rounded px-1'
                onChange={(e) => {
                  const newNullable = e.target.value === 'YES'
                  try {
                    onAddPending(
                      setColumnNullable(dbType, tableName, col.name, newNullable),
                      (s) => ({ ...s, columns: s.columns.map((c) => c.name === col.name ? { ...c, nullable: newNullable } : c) })
                    )
                  } catch (err) { toast.error(extractError(err)) }
                }}
              >
                <option value='YES'>YES</option>
                <option value='NO'>NO</option>
              </select>
            )}
          </div>

          <EditableCell
            value={col.defaultValue ?? ''}
            width='260px'
            mono
            onCommit={(val) => {
              try {
                const newDefault = val === '' ? null : val
                onAddPending(
                  setColumnDefault(dbType, tableName, col.name, newDefault),
                  (s) => ({ ...s, columns: s.columns.map((c) => c.name === col.name ? { ...c, defaultValue: newDefault } : c) })
                )
              } catch (e) { toast.error(extractError(e)) }
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
  onAddPending,
  onCancel,
}: {
  tableName: string
  dbType: DbType
  columnNames: string[]
  onAddPending: OnAddPending
  onCancel: () => void
}) {
  const [indexName, setIndexName] = useState('')
  const [cols, setCols] = useState('')
  const [unique, setUnique] = useState(false)

  const submit = () => {
    if (!indexName.trim() || !cols.trim()) {
      toast.error('Index name and columns are required')
      return
    }
    const colList = cols.split(',').map((c) => c.trim()).filter(Boolean)
    const name = indexName.trim()
    try {
      onAddPending(
        createIndex(dbType, tableName, name, colList, unique),
        (s) => ({
          ...s,
          indexes: [...s.indexes, { name, indexType: 'btree', isUnique: unique, columns: colList, isPrimary: false }],
        })
      )
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
      <Button size='sm' className='h-6 px-3 text-xs' onClick={submit}>Stage</Button>
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
  onAddPending,
}: {
  indexes: TableIndex[]
  tableName: string
  dbType: DbType
  columnNames: string[]
  onAddPending: OnAddPending
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
                onClick={() =>
                  onAddPending(
                    dropIndex(dbType, tableName, idx.name),
                    (s) => ({ ...s, indexes: s.indexes.filter((ix) => ix.name !== idx.name) })
                  )
                }
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
          onAddPending={onAddPending}
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
  const [draft, setDraft] = useState<TableStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const addPendingDdl = useWorkspaceManagerStore((s) => s.addPendingDdl)
  const tabId = activeTab?.id

  // Watch store DDLs length to detect when they're cleared (Discard or Apply from Header)
  const storeDdlCount = useWorkspaceManagerStore((s) => {
    const ws = s.getActiveWorkspace()
    if (!ws || !ws.activeTabId) return 0
    return ws.tabs[ws.activeTabId]?.editingState?.pendingDdls?.length ?? 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await getTableStructure(workspaceId, tableName)
      setDraft(s)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [workspaceId, tableName])

  useEffect(() => { load() }, [load])

  // When store DDLs drop to 0 from > 0 (Discard or Apply), reload structure from DB
  const prevDdlCountRef = useRef(0)
  useEffect(() => {
    const prev = prevDdlCountRef.current
    prevDdlCountRef.current = storeDdlCount
    if (prev > 0 && storeDdlCount === 0) {
      load()
    }
  }, [storeDdlCount, load])

  /** Stage a DDL statement: save to store + apply optimistic update to draft */
  const addPending: OnAddPending = useCallback((sql, applyFn) => {
    if (!tabId) return
    addPendingDdl(workspaceId, tabId, sql)
    setDraft((prev) => prev ? applyFn(prev) : prev)
  }, [workspaceId, tabId, addPendingDdl])

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

  if (!draft) return null

  const columnNames = draft.columns.map((c) => c.name)

  return (
    <div className='flex-1 overflow-auto bg-background p-3 flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5'>
          Columns ({draft.columns.length})
          <span className='normal-case font-normal ml-2 text-muted-foreground/60'>— double-click cell to edit</span>
        </p>
        <div className='overflow-x-auto'>
          <ColumnsGrid
            columns={draft.columns}
            tableName={tableName}
            dbType={dbType}
            onAddPending={addPending}
          />
        </div>
      </div>

      <div className='flex flex-col gap-1.5'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5'>
          Indexes ({draft.indexes.length})
        </p>
        <div className='overflow-x-auto'>
          <IndexesGrid
            indexes={draft.indexes}
            tableName={tableName}
            dbType={dbType}
            columnNames={columnNames}
            onAddPending={addPending}
          />
        </div>
      </div>
    </div>
  )
}
