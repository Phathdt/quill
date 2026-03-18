import { useEffect, useState } from 'react'

import { getTableStructure } from '@/lib/tauri'
import type { TableStructure } from '@/types/schema'
import { AlertCircle, Loader2 } from 'lucide-react'

interface StructureViewProps {
  workspaceId: string
  tableName: string
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
    <div className='flex-1 overflow-auto bg-background'>
      {/* Columns */}
      <table className='w-full text-xs border-collapse'>
        <thead>
          <tr className='bg-muted/60 border-b border-border sticky top-0'>
            <th className='px-3 py-2 text-left text-muted-foreground font-medium w-8'>#</th>
            <th className='px-3 py-2 text-left text-muted-foreground font-medium'>column_name</th>
            <th className='px-3 py-2 text-left text-muted-foreground font-medium'>data_type</th>
            <th className='px-3 py-2 text-left text-muted-foreground font-medium'>is_nullable</th>
            <th className='px-3 py-2 text-left text-muted-foreground font-medium'>column_default</th>
            <th className='px-3 py-2 text-left text-muted-foreground font-medium'>primary_key</th>
          </tr>
        </thead>
        <tbody>
          {structure.columns.map((col, i) => (
            <tr key={col.name} className='border-b border-border'>
              <td className='px-3 py-1.5 text-muted-foreground'>{i + 1}</td>
              <td className='px-3 py-1.5 font-mono font-medium text-foreground'>{col.name}</td>
              <td className='px-3 py-1.5 font-mono text-muted-foreground'>{col.dataType}</td>
              <td className='px-3 py-1.5 text-muted-foreground'>{col.nullable ? 'YES' : 'NO'}</td>
              <td className='px-3 py-1.5 font-mono text-muted-foreground'>{col.defaultValue ?? 'NULL'}</td>
              <td className='px-3 py-1.5 text-muted-foreground'>{col.isPrimaryKey ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Indexes */}
      {structure.indexes.length > 0 && (
        <table className='w-full text-xs border-collapse'>
          <thead>
            <tr className='bg-muted/60 border-b border-t-2 border-border sticky top-0'>
              <th className='px-3 py-2 text-left text-muted-foreground font-medium'>index_name</th>
              <th className='px-3 py-2 text-left text-muted-foreground font-medium'>index_algorithm</th>
              <th className='px-3 py-2 text-left text-muted-foreground font-medium'>is_unique</th>
              <th className='px-3 py-2 text-left text-muted-foreground font-medium'>column_name</th>
            </tr>
          </thead>
          <tbody>
            {structure.indexes.map((idx) => (
              <tr key={idx.name} className='border-b border-border'>
                <td className='px-3 py-1.5 font-mono text-foreground'>{idx.name}</td>
                <td className='px-3 py-1.5 uppercase text-muted-foreground'>{idx.indexType}</td>
                <td className='px-3 py-1.5 text-muted-foreground'>{idx.isUnique ? 'TRUE' : 'FALSE'}</td>
                <td className='px-3 py-1.5 font-mono text-muted-foreground'>{idx.columns.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
