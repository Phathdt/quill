import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { DB_COLORS } from '@/types/workspace'
import { ChevronLeft } from 'lucide-react'

interface HeaderProps {
  onDisconnect?: () => void
}

const DB_LABELS: Record<string, string> = {
  postgres: 'Pg',
  sqlite: 'Sl',
}

export function Header({ onDisconnect }: HeaderProps) {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const workspaceCount = useWorkspaceManagerStore((s) => s.workspaceOrder.length)

  const isConnected = activeWorkspace?.isConnected ?? false
  const dbType = activeWorkspace?.dbType
  const bgColor = dbType ? DB_COLORS[dbType] : undefined
  const label = dbType ? DB_LABELS[dbType] : undefined

  return (
    <header className='flex h-12 items-center border-b border-border bg-card px-4 gap-3'>
      {/* Back button - only when workspace exists */}
      {onDisconnect && activeWorkspace && (
        <Button variant='ghost' size='icon' onClick={onDisconnect} className='h-8 w-8'>
          <ChevronLeft className='h-5 w-5' />
          <span className='sr-only'>Close Workspace</span>
        </Button>
      )}

      {/* Logo */}
      <div className='flex items-center gap-2'>
        <img src='/icon.png' alt='Quill' className='w-6 h-6 object-contain' />
        <h1 className='text-lg font-semibold text-foreground'>Quill</h1>
      </div>

      {/* Divider */}
      <Separator orientation='vertical' className='h-6' />

      {/* Active workspace info */}
      {activeWorkspace && bgColor && label && (
        <div className='flex items-center gap-2'>
          <div
            className='w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs'
            style={{ backgroundColor: bgColor }}
          >
            {label}
          </div>
          <span className='text-sm text-foreground'>{activeWorkspace.name}</span>
          {activeWorkspace.schema && (
            <>
              <span className='text-muted-foreground'>/</span>
              <span className='text-sm text-muted-foreground'>{activeWorkspace.schema}</span>
            </>
          )}
        </div>
      )}

      {/* Workspace count badge */}
      {workspaceCount > 1 && (
        <Badge variant='secondary' className='text-xs'>
          {workspaceCount} workspaces
        </Badge>
      )}

      {/* Spacer */}
      <div className='flex-1' />

      {/* Connection status */}
      <Badge
        variant='outline'
        className={cn(isConnected ? 'text-emerald-400 border-emerald-400/30' : 'text-gray-400 border-gray-400/30')}
      >
        <div
          className={cn('w-2 h-2 rounded-full mr-2', isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400')}
        />
        {isConnected ? 'Connected' : 'Disconnected'}
      </Badge>
    </header>
  )
}
