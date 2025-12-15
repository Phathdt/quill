import { Button } from '@/components/ui/button'
import { DB_COLORS, type Workspace } from '@/types/workspace'
import { X } from 'lucide-react'

interface WorkspaceTooltipProps {
  workspace: Workspace
  onClose: () => void
  onCloseThis: () => void
  onCloseOthers: () => void
  hasOtherWorkspaces: boolean
  position: { x: number; y: number }
}

export function WorkspaceTooltip({
  workspace,
  onClose,
  onCloseThis,
  onCloseOthers,
  hasOtherWorkspaces,
  position,
}: WorkspaceTooltipProps) {
  return (
    <div
      className='fixed z-50 w-56 bg-popover border border-border rounded-lg shadow-lg p-3'
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className='flex items-center gap-2 mb-3'>
        <div
          className='w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs'
          style={{ backgroundColor: DB_COLORS[workspace.dbType] }}
        >
          {workspace.dbType === 'postgres' ? 'Pg' : 'Sl'}
        </div>
        <span className='font-medium text-sm truncate flex-1'>{workspace.name}</span>
        <Button variant='ghost' size='icon' className='h-6 w-6' onClick={onClose}>
          <X className='h-3 w-3' />
        </Button>
      </div>

      {/* Details */}
      <div className='space-y-1 text-xs text-muted-foreground mb-3'>
        <div className='flex justify-between'>
          <span>Type:</span>
          <span className='text-foreground capitalize'>{workspace.dbType}</span>
        </div>
        {workspace.schema && (
          <div className='flex justify-between'>
            <span>Schema:</span>
            <span className='text-foreground'>{workspace.schema}</span>
          </div>
        )}
        <div className='flex justify-between'>
          <span>Status:</span>
          <span className={workspace.isConnected ? 'text-emerald-400' : 'text-gray-400'}>
            {workspace.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className='flex justify-between'>
          <span>Tabs:</span>
          <span className='text-foreground'>{workspace.tabOrder.length}</span>
        </div>
      </div>

      {/* Actions */}
      <div className='flex flex-col gap-2'>
        <Button variant='outline' size='sm' className='w-full h-7 text-xs justify-start' onClick={onCloseThis}>
          Close This Connection
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='w-full h-7 text-xs justify-start'
          onClick={onCloseOthers}
          disabled={!hasOtherWorkspaces}
        >
          Close Other Connections
        </Button>
      </div>
    </div>
  )
}
