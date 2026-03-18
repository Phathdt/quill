import { useEffect, useState } from 'react'

import { getTableStructure } from '@/lib/tauri'
import type { TableColumn, TableIndex, TableStructure } from '@/types/schema'
import { AlertCircle, Loader2 } from 'lucide-react'

interface StructureViewProps {
  workspaceId: string
  tableName: string
}

// Reusable mini-datagrid header cell
function GridTh({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <div
      className='flex items-center px-3 h-8 text-xs font-semibold text-muted-foreground border-r border-border bg-card shrink-0 select-none'
      style={{ width: width ?? 150, minWidth: width ?? 150 }}
    >
      {children}
    </div>
  )
}

// Reusable mini-datagrid data cell
function GridTd({ children, width, mono }: { children: React.ReactNode; width?: string; mono?: boolean }) {
  return (
    <div
      className={`flex items-center px-3 h-8 text-xs border-r border-border shrink-0 truncate ${mono ? 'font-mono' : ''}`}
      style={{ width: width ?? 150, minWidth: width ?? 150 }}
    >
      {children}
    </div>
  )
}

function ColumnsGrid({ columns }: { columns: TableColumn[] }) {
  return (
    <div className='flex flex-col border border-border rounded-sm overflow-hidden'>
      {/* Header */}
      <div className='flex border-b border-border bg-card sticky top-0 z-10'>
        <GridTh width='40px'>#</GridTh>
        <GridTh width='200px'>column_name</GridTh>
        <GridTh width='180px'>data_type</GridTh>
        <GridTh width='100px'>is_nullable</GridTh>
        <GridTh width='260px'>column_default</GridTh>
        <GridTh width='100px'>primary_key</GridTh>
      </div>
      {/* Rows */}
      {columns.map((col, i) => (
        <div key={col.name} className={`flex border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
          <GridTd width='40px'><span className='text-muted-foreground'>{i + 1}</span></GridTd>
          <GridTd width='200px' mono><span className='font-medium text-foreground'>{col.name}</span></GridTd>
          <GridTd width='180px' mono><span className='text-muted-foreground'>{col.dataType}</span></GridTd>
          <GridTd width='100px'><span className='text-muted-foreground'>{col.nullable ? 'YES' : 'NO'}</span></GridTd>
          <GridTd width='260px' mono><span className='text-muted-foreground truncate'>{col.defaultValue ?? 'NULL'}</span></GridTd>
          <GridTd width='100px'><span className={col.isPrimaryKey ? 'text-amber-400 font-semibold' : 'text-muted-foreground'}>{col.isPrimaryKey ? 'YES' : 'NO'}</span></GridTd>
        </div>
      ))}
      {columns.length === 0 && (
        <div className='px-3 py-4 text-xs text-muted-foreground'>No columns</div>
      )}
    </div>
  )
}

function IndexesGrid({ indexes }: { indexes: TableIndex[] }) {
  if (indexes.length === 0) return null
  return (
    <div className='flex flex-col border border-border rounded-sm overflow-hidden'>
      {/* Header */}
      <div className='flex border-b border-border bg-card sticky top-0 z-10'>
        <GridTh width='280px'>index_name</GridTh>
        <GridTh width='120px'>index_algorithm</GridTh>
        <GridTh width='90px'>is_unique</GridTh>
        <GridTh width='220px'>column_name</GridTh>
        <GridTh width='100px'>is_primary</GridTh>
      </div>
      {/* Rows */}
      {indexes.map((idx, i) => (
        <div key={idx.name} className={`flex border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
          <GridTd width='280px' mono><span className='text-foreground'>{idx.name}</span></GridTd>
          <GridTd width='120px'><span className='uppercase text-muted-foreground'>{idx.indexType}</span></GridTd>
          <GridTd width='90px'><span className={idx.isUnique ? 'text-emerald-400' : 'text-muted-foreground'}>{idx.isUnique ? 'TRUE' : 'FALSE'}</span></GridTd>
          <GridTd width='220px' mono><span className='text-muted-foreground'>{idx.columns.join(', ')}</span></GridTd>
          <GridTd width='100px'><span className={idx.isPrimary ? 'text-amber-400 font-semibold' : 'text-muted-foreground'}>{idx.isPrimary ? 'YES' : 'NO'}</span></GridTd>
        </div>
      ))}
    </div>
  )
}

export function StructureView({ workspaceId, tableName }: StructureViewProps) {
  const [structure, setStructure] = useState<TableStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await getTableStructure(workspaceId, tableName)
        setStructure(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [workspaceId, tableName])

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

  return (
    <div className='flex-1 overflow-auto bg-background p-3 flex flex-col gap-4'>
      {/* Columns section */}
      <div className='flex flex-col gap-1.5'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5'>
          Columns ({structure.columns.length})
        </p>
        <div className='overflow-x-auto'>
          <ColumnsGrid columns={structure.columns} />
        </div>
      </div>

      {/* Indexes section */}
      {structure.indexes.length > 0 && (
        <div className='flex flex-col gap-1.5'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5'>
            Indexes ({structure.indexes.length})
          </p>
          <div className='overflow-x-auto'>
            <IndexesGrid indexes={structure.indexes} />
          </div>
        </div>
      )}
    </div>
  )
}
