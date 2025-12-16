import { Button } from '@/components/ui/button'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { Command, Database, FileText } from 'lucide-react'

interface EmptyStateProps {
  onCreateTab?: () => void
}

export function EmptyState({ onCreateTab }: EmptyStateProps) {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())

  return (
    <div className='flex-1 flex items-center justify-center'>
      <div className='max-w-md w-full p-8 text-center'>
        {/* Icon */}
        <div className='w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center'>
          <Database className='w-8 h-8 text-muted-foreground' />
        </div>

        {/* Title */}
        <h2 className='text-xl font-semibold mb-2'>
          {activeWorkspace?.isConnected ? 'Ready to query' : 'Not connected'}
        </h2>

        {/* Description */}
        <p className='text-muted-foreground mb-6'>
          {activeWorkspace?.isConnected
            ? 'Start writing SQL or explore your tables from the sidebar.'
            : 'Select a connection from the sidebar to get started.'}
        </p>

        {/* Quick actions (only when connected) */}
        {activeWorkspace?.isConnected && (
          <div className='space-y-3'>
            <Button onClick={onCreateTab} className='w-full justify-start gap-3' variant='secondary'>
              <FileText className='w-4 h-4' />
              <span>New SQL Query</span>
              <kbd className='ml-auto text-xs bg-muted px-1.5 py-0.5 rounded'>
                <Command className='w-3 h-3 inline' />T
              </kbd>
            </Button>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className='mt-8 pt-6 border-t border-border'>
          <p className='text-xs text-muted-foreground mb-3'>Keyboard shortcuts</p>
          <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
            <div className='flex items-center justify-between px-2 py-1 bg-muted/50 rounded'>
              <span>New tab</span>
              <kbd className='bg-background px-1.5 py-0.5 rounded'>
                <Command className='w-2.5 h-2.5 inline' />T
              </kbd>
            </div>
            <div className='flex items-center justify-between px-2 py-1 bg-muted/50 rounded'>
              <span>Execute</span>
              <kbd className='bg-background px-1.5 py-0.5 rounded'>
                <Command className='w-2.5 h-2.5 inline' />
                Enter
              </kbd>
            </div>
            <div className='flex items-center justify-between px-2 py-1 bg-muted/50 rounded'>
              <span>Format SQL</span>
              <kbd className='bg-background px-1.5 py-0.5 rounded text-[10px]'>
                <Command className='w-2.5 h-2.5 inline' />
                Shift+F
              </kbd>
            </div>
            <div className='flex items-center justify-between px-2 py-1 bg-muted/50 rounded'>
              <span>Command</span>
              <kbd className='bg-background px-1.5 py-0.5 rounded'>
                <Command className='w-2.5 h-2.5 inline' />K
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
