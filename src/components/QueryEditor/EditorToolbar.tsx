import { Button } from '@/components/ui/button'
import { useExecuteQuery } from '@/hooks/useExecuteQuery'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Eraser, Loader2, Play } from 'lucide-react'

export function EditorToolbar() {
  const { execute, loading } = useExecuteQuery()
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const setTabSql = useWorkspaceStore((s) => s.setTabSql)

  const handleClear = () => {
    if (activeTabId) {
      setTabSql(activeTabId, '')
    }
  }

  const handleExecute = () => {
    execute()
  }

  return (
    <div className='flex items-center gap-2 px-3 py-2 bg-card border-t border-border'>
      <Button onClick={handleExecute} disabled={loading} size='sm' className='gap-2'>
        {loading ? (
          <>
            <Loader2 className='h-4 w-4 animate-spin' />
            Running...
          </>
        ) : (
          <>
            <Play className='h-4 w-4' />
            Execute
          </>
        )}
      </Button>
      <Button onClick={handleClear} variant='ghost' size='sm'>
        <Eraser className='h-4 w-4 mr-2' />
        Clear
      </Button>

      <div className='flex-1' />

      <span className='text-xs text-muted-foreground'>
        <kbd className='px-1.5 py-0.5 bg-muted rounded text-muted-foreground'>⌘</kbd>
        <span className='mx-1'>+</span>
        <kbd className='px-1.5 py-0.5 bg-muted rounded text-muted-foreground'>Enter</kbd>
        <span className='ml-2'>to execute</span>
      </span>
    </div>
  )
}
