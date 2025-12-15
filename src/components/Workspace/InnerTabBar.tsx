import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { Plus, Table, Terminal, X } from 'lucide-react'

export function InnerTabBar() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const closeTab = useWorkspaceManagerStore((s) => s.closeTab)
  const switchTab = useWorkspaceManagerStore((s) => s.switchTab)
  const closeOtherTabs = useWorkspaceManagerStore((s) => s.closeOtherTabs)
  const closeTabsToRight = useWorkspaceManagerStore((s) => s.closeTabsToRight)
  const closeAllTabs = useWorkspaceManagerStore((s) => s.closeAllTabs)
  const renameTab = useWorkspaceManagerStore((s) => s.renameTab)

  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  if (!activeWorkspace) {
    return <div className='h-9 bg-card border-b border-border' />
  }

  const { id: workspaceId, tabs, tabOrder, activeTabId } = activeWorkspace
  const canCloseTab = tabOrder.length > 1

  const handleNewQueryTab = () => {
    createTab(workspaceId, 'query', 'SQL Query')
  }

  const handleStartRename = (tabId: string, currentName: string) => {
    setRenamingTabId(tabId)
    setRenameValue(currentName)
  }

  const handleFinishRename = () => {
    if (renamingTabId && renameValue.trim()) {
      renameTab(workspaceId, renamingTabId, renameValue.trim())
    }
    setRenamingTabId(null)
    setRenameValue('')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename()
    } else if (e.key === 'Escape') {
      setRenamingTabId(null)
      setRenameValue('')
    }
  }

  const getTabsToRightCount = (tabId: string) => {
    const index = tabOrder.indexOf(tabId)
    return tabOrder.length - index - 1
  }

  return (
    <div className='flex items-center h-9 bg-card border-b border-border overflow-x-auto'>
      {tabOrder.map((tabId) => {
        const tab = tabs[tabId]
        if (!tab) return null

        const isActive = tabId === activeTabId
        const Icon = tab.type === 'table' ? Table : Terminal
        const isRenaming = renamingTabId === tabId
        const tabsToRight = getTabsToRightCount(tabId)

        return (
          <ContextMenu key={tabId}>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  'group flex items-center gap-1.5 px-3 py-1.5 border-r border-border cursor-pointer',
                  'min-w-[100px] max-w-[180px] shrink-0',
                  'hover:bg-muted/50 transition-colors',
                  isActive && 'bg-background border-b-2 border-b-primary -mb-px'
                )}
                onClick={() => switchTab(workspaceId, tabId)}
              >
                <Icon className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                {isRenaming ? (
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={handleRenameKeyDown}
                    className='h-5 text-xs px-1 py-0'
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className='truncate text-xs flex-1'>
                    {tab.name}
                    {tab.isDirty && <span className='text-muted-foreground ml-0.5'>*</span>}
                  </span>
                )}
                {canCloseTab && !isRenaming && (
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
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={handleNewQueryTab}>New Tab</ContextMenuItem>
              <ContextMenuItem onClick={() => closeTab(workspaceId, tabId)} disabled={!canCloseTab}>
                Close Tab
              </ContextMenuItem>
              <ContextMenuItem onClick={() => closeOtherTabs(workspaceId, tabId)} disabled={tabOrder.length <= 1}>
                Close Other Tabs
              </ContextMenuItem>
              <ContextMenuItem onClick={() => closeTabsToRight(workspaceId, tabId)} disabled={tabsToRight === 0}>
                Close Tabs to the Right
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => closeAllTabs(workspaceId)}>Close All Tabs</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => handleStartRename(tabId, tab.name)}>Rename Tab</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
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
