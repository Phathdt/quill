import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { Code } from 'lucide-react'

export function GeneratedSqlBar() {
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())

  if (!activeTab || activeTab.type !== 'table' || !activeTab.sql) {
    return null
  }

  return (
    <div className='flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border text-xs'>
      <Code className='h-3.5 w-3.5 text-muted-foreground flex-shrink-0' />
      <code className='text-muted-foreground font-mono truncate flex-1'>{activeTab.sql}</code>
    </div>
  )
}
