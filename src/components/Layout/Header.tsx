import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useInlineEditing } from '@/hooks/useInlineEditing'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { DB_COLORS } from '@/types/workspace'
import { ChevronLeft, Eye, PanelBottom, PanelLeft, PanelRight, RotateCcw, Save } from 'lucide-react'

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

  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const leftPanelOpen = useUiStore((s) => s.leftPanelOpen)
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel)
  const sqlBarOpen = useUiStore((s) => s.sqlBarOpen)
  const toggleSqlBar = useUiStore((s) => s.toggleSqlBar)
  const setSqlPreviewOpen = useUiStore((s) => s.setSqlPreviewOpen)

  const { hasPendingChanges, savePendingChanges, discardPendingChanges } = useInlineEditing()
  const setSidebarOpen = useWorkspaceManagerStore((s) => s.setSidebarOpen)
  const setSidebarRowIndex = useWorkspaceManagerStore((s) => s.setSidebarRowIndex)

  const isConnected = activeWorkspace?.isConnected ?? false
  const dbType = activeWorkspace?.dbType
  const bgColor = dbType ? DB_COLORS[dbType] : undefined
  const label = dbType ? DB_LABELS[dbType] : undefined

  const sidebarState = activeTab?.sidebarState
  const isRecordSidebarOpen = sidebarState?.isOpen && sidebarState.mode === 'record'

  const handleToggleRecordSidebar = () => {
    if (!activeWorkspace || !activeTab) return
    if (isRecordSidebarOpen) {
      setSidebarOpen(activeWorkspace.id, activeTab.id, false)
    } else {
      if (sidebarState?.selectedRowIndex === null) {
        setSidebarRowIndex(activeWorkspace.id, activeTab.id, 0)
      }
      setSidebarOpen(activeWorkspace.id, activeTab.id, true, 'record')
    }
  }

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

      {/* Connection status + Panel toggles */}
      <div className='flex items-center gap-2'>
        <Badge
          variant='outline'
          className={cn(isConnected ? 'text-emerald-400 border-emerald-400/30' : 'text-gray-400 border-gray-400/30')}
        >
          <div
            className={cn('w-2 h-2 rounded-full mr-2', isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400')}
          />
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
        {/* Pending changes actions — only visible when edits exist */}
        {hasPendingChanges && (
          <>
            <Button
              size='icon'
              variant='ghost'
              className='h-7 w-7 text-muted-foreground hover:text-destructive'
              onClick={discardPendingChanges}
              title='Discard all changes'
            >
              <RotateCcw className='h-3.5 w-3.5' />
            </Button>
            <Button
              size='icon'
              variant='ghost'
              className='h-7 w-7 text-muted-foreground hover:text-foreground'
              onClick={() => setSqlPreviewOpen(true)}
              title='Preview SQL'
            >
              <Eye className='h-3.5 w-3.5' />
            </Button>
            <Button
              size='icon'
              variant='ghost'
              className='h-7 w-7 text-amber-400 hover:text-amber-300'
              onClick={savePendingChanges}
              title='Apply changes (Cmd+S)'
            >
              <Save className='h-3.5 w-3.5' />
            </Button>
            <div className='w-px h-4 bg-border' />
          </>
        )}
        <Button
          size='icon'
          variant={leftPanelOpen ? 'secondary' : 'ghost'}
          className='h-7 w-7'
          onClick={toggleLeftPanel}
          title='Toggle Left Panel (Cmd+B)'
        >
          <PanelLeft className='h-4 w-4' />
        </Button>
        {activeTab?.type === 'table' && (
          <Button
            size='icon'
            variant={sqlBarOpen ? 'secondary' : 'ghost'}
            className='h-7 w-7'
            onClick={toggleSqlBar}
            title='Toggle SQL Bar'
          >
            <PanelBottom className='h-4 w-4' />
          </Button>
        )}
        {activeTab && (
          <Button
            size='icon'
            variant={isRecordSidebarOpen ? 'secondary' : 'ghost'}
            className='h-7 w-7'
            onClick={handleToggleRecordSidebar}
            title='Toggle Record Detail (Cmd+D)'
          >
            <PanelRight className='h-4 w-4' />
          </Button>
        )}
      </div>
    </header>
  )
}
