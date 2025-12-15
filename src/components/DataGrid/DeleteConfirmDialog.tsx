import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmDialogProps {
  rowCount: number
  tableName: string
  isOpen: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function DeleteConfirmDialog({ rowCount, tableName, isOpen, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onCancel() // Close on success
    } catch (e) {
      console.error('Delete failed:', e)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-destructive'>
            <AlertTriangle className='h-5 w-5' />
            Confirm Deletion
          </DialogTitle>
        </DialogHeader>

        <div className='py-4'>
          <p>
            Are you sure you want to delete{' '}
            <strong>
              {rowCount} row{rowCount > 1 ? 's' : ''}
            </strong>{' '}
            from <code className='px-1 bg-muted rounded'>{tableName}</code>?
          </p>
          <p className='text-sm text-muted-foreground mt-2'>This action cannot be undone.</p>
        </div>

        <DialogFooter>
          <Button variant='ghost' onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant='destructive' onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
