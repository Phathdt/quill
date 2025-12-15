import { Badge } from '@/components/ui/badge'
import type { TableIndex } from '@/types/schema'

interface IndexesTableProps {
  indexes: TableIndex[]
}

export function IndexesTable({ indexes }: IndexesTableProps) {
  return (
    <div className='overflow-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border bg-muted/50'>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Index Name</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Columns</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Properties</th>
          </tr>
        </thead>
        <tbody>
          {indexes.map((index) => (
            <tr key={index.name} className='border-b border-border hover:bg-accent/50 transition-colors'>
              <td className='px-4 py-3 font-mono font-medium text-foreground'>{index.name}</td>
              <td className='px-4 py-3'>
                <div className='flex flex-wrap gap-1'>
                  {index.columns.map((col) => (
                    <Badge key={col} variant='outline' className='font-mono text-xs'>
                      {col}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className='px-4 py-3'>
                <div className='flex gap-2'>
                  {index.isPrimary && (
                    <Badge className='bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'>
                      PRIMARY
                    </Badge>
                  )}
                  {index.isUnique && (
                    <Badge className='bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'>
                      UNIQUE
                    </Badge>
                  )}
                  {!index.isPrimary && !index.isUnique && (
                    <Badge variant='outline' className='bg-muted/50 text-muted-foreground'>
                      INDEX
                    </Badge>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {indexes.length === 0 && <div className='py-8 text-center text-muted-foreground'>No indexes found</div>}
    </div>
  )
}
