import { useQueryStats } from '@/hooks/useQueryStats'
import { cn } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { DB_COLORS } from '@/types/workspace'
import { Activity, Database, Layers, Rows3, Timer } from 'lucide-react'

export function StatusBar() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const workspaceCount = useWorkspaceManagerStore((s) => s.workspaceOrder.length)
  const { rowCount, executionTimeMs, hasResult, isLoading } = useQueryStats()

  // Not connected state
  if (!activeWorkspace) {
    return (
      <footer className='h-7 bg-card border-t border-border flex items-center px-3'>
        <span className='text-xs text-muted-foreground'>Ready</span>
      </footer>
    )
  }

  const { dbType, name, schema, isConnected } = activeWorkspace

  return (
    <footer className='h-7 bg-card border-t border-border flex items-center px-3 gap-4 text-xs'>
      {/* Left side: Connection info */}
      <div className='flex items-center gap-3'>
        {/* DB type indicator with pulse animation */}
        <div className='flex items-center gap-1.5'>
          <div
            className={cn('w-2.5 h-2.5 rounded-full', isConnected && 'animate-pulse')}
            style={{ backgroundColor: DB_COLORS[dbType] }}
          />
          <span className='capitalize font-medium'>{dbType}</span>
        </div>

        {/* Workspace name */}
        <div className='flex items-center gap-1 text-muted-foreground'>
          <Database className='w-3 h-3' />
          <span>{name}</span>
        </div>

        {/* Schema (postgres only) */}
        {schema && (
          <div className='flex items-center gap-1 text-muted-foreground'>
            <span className='text-muted-foreground/50'>/</span>
            <Layers className='w-3 h-3' />
            <span>{schema}</span>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className='flex-1' />

      {/* Right side: Query stats & status */}
      <div className='flex items-center gap-4'>
        {/* Query results (only show when we have results) */}
        {hasResult && !isLoading && (
          <>
            {/* Row count */}
            {rowCount !== null && (
              <div className='flex items-center gap-1 text-muted-foreground'>
                <Rows3 className='w-3 h-3' />
                <span>
                  {rowCount.toLocaleString()} row{rowCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Execution time */}
            {executionTimeMs !== null && (
              <div className='flex items-center gap-1 text-muted-foreground'>
                <Timer className='w-3 h-3' />
                <span>{executionTimeMs}ms</span>
              </div>
            )}
          </>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className='flex items-center gap-1 text-muted-foreground'>
            <Activity className='w-3 h-3 animate-pulse' />
            <span>Executing...</span>
          </div>
        )}

        {/* Workspace count */}
        {workspaceCount > 1 && (
          <div className='flex items-center gap-1 text-muted-foreground'>
            <span>
              {workspaceCount} workspace{workspaceCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Connection status */}
        <div className='flex items-center gap-1.5'>
          <div className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-400' : 'bg-gray-400')} />
          <span className='text-muted-foreground'>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </footer>
  )
}
