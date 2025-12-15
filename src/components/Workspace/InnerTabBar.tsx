import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { Plus, Table, Terminal, X } from 'lucide-react'

export function InnerTabBar() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const closeTab = useWorkspaceManagerStore((s) => s.closeTab)
  const switchTab = useWorkspaceManagerStore((s) => s.switchTab)

  if (!activeWorkspace) {
    return <div className='h-9 bg-card border-b border-border' />
  }

  const { id: workspaceId, tabs, tabOrder, activeTabId } = activeWorkspace
  const canCloseTab = tabOrder.length > 1

  const handleNewQueryTab = () => {
    createTab(workspaceId, 'query', 'SQL Query')
  }

  return (
    <div className='flex items-center h-9 bg-card border-b border-border overflow-x-auto'>
      {tabOrder.map((tabId) => {
        const tab = tabs[tabId]
        if (!tab) return null

        const isActive = tabId === activeTabId
        const Icon = tab.type === 'table' ? Table : Terminal

        return (
          <div
            key={tabId}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 border-r border-border cursor-pointer',
              'min-w-[100px] max-w-[180px] shrink-0',
              'hover:bg-muted/50 transition-colors',
              isActive && 'bg-background border-b-2 border-b-primary -mb-px'
            )}
            onClick={() => switchTab(workspaceId, tabId)}
          >
            <Icon className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <span className='truncate text-xs flex-1'>
              {tab.name}
              {tab.isDirty && <span className='text-muted-foreground ml-0.5'>*</span>}
            </span>
            {canCloseTab && (
              <button
                className={cn(
                  'p-0.5 rounded hover:bg-destructive/20 hover:text-destructive',
                  'opacity-0 group-hover:opacity-100 transition-opacity'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(workspaceId, tabId)
                }}
                title='Close tab'
              >
                <X className='h-3 w-3' />
              </button>
            )}
          </div>
        )
      })}

      <Button
        variant='ghost'
        size='icon'
        className='h-7 w-7 ml-1 shrink-0'
        onClick={handleNewQueryTab}
        title='New Query'
      >
        <Plus className='h-3.5 w-3.5' />
      </Button>
    </div>
  )
}
