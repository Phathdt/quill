import { Button } from '@/components/ui/button'
import { useExecuteQuery } from '@/hooks/useExecuteQuery'
import { formatSql } from '@/lib/sql-formatter'
import { useSchemaStore } from '@/stores/schemaStore'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { Code, Eraser, Loader2, Play, RefreshCw } from 'lucide-react'

export function EditorToolbar() {
  const { execute, loading } = useExecuteQuery()
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)

  const handleClear = () => {
    if (activeWorkspace && activeTab) {
      setTabSql(activeWorkspace.id, activeTab.id, '')
    }
  }

  const handleExecute = () => {
    execute()
  }

  const handleFormat = () => {
    if (activeWorkspace && activeTab?.sql) {
      const dbType = activeWorkspace.dbType
      const language = dbType === 'postgres' ? 'postgresql' : 'sqlite'
      const formatted = formatSql(activeTab.sql, language)
      setTabSql(activeWorkspace.id, activeTab.id, formatted)
    }
  }

  const handleRefreshSchema = () => {
    if (activeWorkspace?.id) {
      useSchemaStore.getState().refreshSchema(activeWorkspace.id)
    }
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

      <Button onClick={handleFormat} variant='ghost' size='sm' disabled={!activeTab?.sql}>
        <Code className='h-4 w-4 mr-2' />
        Format
      </Button>

      <Button
        onClick={handleRefreshSchema}
        variant='ghost'
        size='sm'
        className='h-8'
        title='Refresh schema for autocomplete'
      >
        <RefreshCw className='h-4 w-4' />
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
