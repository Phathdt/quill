import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { TableIndex } from '@/types/schema'
import { Hash, Info, Key, TreeDeciduous } from 'lucide-react'

interface IndexesTableProps {
  indexes: TableIndex[]
}

const INDEX_TYPE_ICONS: Record<string, React.ReactNode> = {
  btree: <TreeDeciduous className='h-3 w-3' />,
  hash: <Hash className='h-3 w-3' />,
  gin: <Hash className='h-3 w-3' />,
  gist: <Hash className='h-3 w-3' />,
}

export function IndexesTable({ indexes }: IndexesTableProps) {
  return (
    <div className='overflow-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border bg-muted/50'>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Index Name</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Columns</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Type</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Properties</th>
          </tr>
        </thead>
        <tbody>
          {indexes.map((index) => (
            <tr key={index.name} className='border-b border-border hover:bg-accent/50 transition-colors'>
              <td className='px-4 py-3'>
                <div className='flex items-center gap-2'>
                  {index.isPrimary && <Key className='h-3 w-3 text-amber-400' />}
                  <code className='text-xs font-mono font-medium text-foreground'>{index.name}</code>
                  {index.definition && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className='p-1 hover:bg-accent rounded'>
                            <Info className='h-3 w-3 text-muted-foreground' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side='right' className='max-w-md'>
                          <pre className='text-xs font-mono whitespace-pre-wrap'>{index.definition}</pre>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </td>
              <td className='px-4 py-3'>
                <div className='flex flex-wrap gap-1'>
                  {index.columns.map((col, i) => (
                    <Badge key={col} variant='outline' className='font-mono text-xs'>
                      {i + 1}. {col}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className='px-4 py-3'>
                <div className='flex items-center gap-1 text-muted-foreground'>
                  {INDEX_TYPE_ICONS[index.indexType] ?? null}
                  <span className='text-xs uppercase'>{index.indexType}</span>
                </div>
              </td>
              <td className='px-4 py-3'>
                <div className='flex gap-2'>
                  {index.isPrimary && (
                    <Badge className='bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 text-xs'>
                      PRIMARY
                    </Badge>
                  )}
                  {index.isUnique && !index.isPrimary && (
                    <Badge className='bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 text-xs'>
                      UNIQUE
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
