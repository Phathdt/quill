import { Badge } from '@/components/ui/badge'
import type { TableColumn } from '@/types/schema'
import { Key } from 'lucide-react'

interface ColumnsTableProps {
  columns: TableColumn[]
}

export function ColumnsTable({ columns }: ColumnsTableProps) {
  return (
    <div className='overflow-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border bg-muted/50'>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Name</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Type</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Nullable</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Default</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Constraints</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.name} className='border-b border-border hover:bg-accent/50 transition-colors'>
              <td className='px-4 py-3 font-mono font-medium text-foreground'>{column.name}</td>
              <td className='px-4 py-3 font-mono text-muted-foreground'>{column.dataType}</td>
              <td className='px-4 py-3'>
                {column.nullable ? (
                  <Badge variant='outline' className='bg-muted/50 text-muted-foreground border-muted-foreground/30'>
                    Nullable
                  </Badge>
                ) : (
                  <Badge variant='outline' className='bg-amber-500/10 text-amber-600 border-amber-500/30'>
                    NOT NULL
                  </Badge>
                )}
              </td>
              <td className='px-4 py-3 font-mono text-sm text-muted-foreground'>
                {column.defaultValue ? column.defaultValue : <span className='italic opacity-50'>None</span>}
              </td>
              <td className='px-4 py-3'>
                <div className='flex gap-2'>
                  {column.isPrimaryKey && (
                    <Badge className='bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'>
                      <Key className='w-3 h-3 mr-1' />
                      PRIMARY KEY
                    </Badge>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {columns.length === 0 && <div className='py-8 text-center text-muted-foreground'>No columns found</div>}
    </div>
  )
}
