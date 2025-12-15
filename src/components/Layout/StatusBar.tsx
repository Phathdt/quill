import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { DB_COLORS } from '@/types/workspace'

export function StatusBar() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())

  if (!activeWorkspace) {
    return (
      <footer className='h-6 bg-card border-t border-border flex items-center px-3'>
        <span className='text-xs text-muted-foreground'>Ready</span>
      </footer>
    )
  }

  const { dbType, name, schema, isConnected } = activeWorkspace

  return (
    <footer className='h-6 bg-card border-t border-border flex items-center px-3 gap-3'>
      {/* DB type indicator */}
      <div className='flex items-center gap-1.5'>
        <div className='w-3 h-3 rounded-full' style={{ backgroundColor: DB_COLORS[dbType] }} />
        <span className='text-xs capitalize'>{dbType}</span>
      </div>

      {/* Workspace name */}
      <span className='text-xs text-muted-foreground'>{name}</span>

      {/* Schema (postgres only) */}
      {schema && (
        <>
          <span className='text-muted-foreground'>/</span>
          <span className='text-xs'>{schema}</span>
        </>
      )}

      {/* Spacer */}
      <div className='flex-1' />

      {/* Connection status */}
      <div className='flex items-center gap-1.5'>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-400'}`} />
        <span className='text-xs text-muted-foreground'>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </footer>
  )
}
