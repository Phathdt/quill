import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface RowManagerProps {
  onAddRow: () => void
  onDeleteSelected: () => void
  selectedRowCount: number
  canEdit: boolean
}

export function RowManager({ onAddRow, onDeleteSelected, selectedRowCount, canEdit }: RowManagerProps) {
  if (!canEdit) return null

  return (
    <div className='flex items-center gap-2'>
      <Button size='sm' variant='ghost' onClick={onAddRow} className='h-7 text-xs'>
        <Plus className='h-3 w-3 mr-1' />
        Add Row
      </Button>
      {selectedRowCount > 0 && (
        <Button
          size='sm'
          variant='ghost'
          onClick={onDeleteSelected}
          className='h-7 text-xs text-destructive hover:text-destructive'
        >
          <Trash2 className='h-3 w-3 mr-1' />
          Delete ({selectedRowCount})
        </Button>
      )}
    </div>
  )
}
