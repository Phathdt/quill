import { Button } from '@/components/ui/button'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { Save } from 'lucide-react'

interface EditingToolbarProps {
  onSave: () => void
  onDiscard: () => void
}

export function EditingToolbar({ onSave, onDiscard }: EditingToolbarProps) {
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const pendingCount = Object.keys(activeTab?.editingState?.pendingChanges ?? {}).length

  if (pendingCount === 0) return null

  return (
    <div className='flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30'>
      <span className='text-xs text-amber-400'>
        {pendingCount} pending change{pendingCount > 1 ? 's' : ''}
      </span>
      <div className='flex-1' />
      <Button size='sm' variant='ghost' onClick={onDiscard} className='h-6 text-xs'>
        Discard
      </Button>
      <Button size='sm' onClick={onSave} className='h-6 text-xs bg-amber-500 hover:bg-amber-600'>
        <Save className='h-3 w-3 mr-1' />
        Save (Cmd+S)
      </Button>
    </div>
  )
}
