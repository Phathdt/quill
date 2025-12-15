import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface QuickActionsProps {
  onCreateConnection: () => void
}

export function QuickActions({ onCreateConnection }: QuickActionsProps) {
  return (
    <div className='space-y-2'>
      <Button onClick={onCreateConnection} variant='secondary' className='w-full justify-start gap-3'>
        <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center'>
          <Plus className='w-4 h-4 text-primary' />
        </div>
        <div className='text-left'>
          <p className='text-sm font-medium'>New Connection</p>
          <p className='text-xs text-muted-foreground'>PostgreSQL or SQLite</p>
        </div>
      </Button>
    </div>
  )
}
