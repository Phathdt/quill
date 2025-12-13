import { Badge } from '@/components/ui/badge'

interface GridToolbarProps {
  rowCount: number
  executionTime: number
}

export function GridToolbar({ rowCount, executionTime }: GridToolbarProps) {
  return (
    <div className='flex items-center justify-between border-b border-border bg-card px-3 py-1.5 text-xs'>
      <div className='flex items-center gap-4'>
        <span className='text-foreground'>
          <span className='text-muted-foreground'>Rows:</span> {rowCount.toLocaleString()}
        </span>
      </div>
      <div className='flex items-center gap-4'>
        <span className='text-muted-foreground'>
          Executed in{' '}
          <Badge variant='outline' className='text-emerald-400 border-emerald-400/30'>
            {executionTime}ms
          </Badge>
        </span>
      </div>
    </div>
  )
}
