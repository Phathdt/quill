import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { Home, Plus, Settings } from 'lucide-react'

import { WorkspaceIcon } from './WorkspaceIcon'
import { WorkspaceTooltip } from './WorkspaceTooltip'

interface ActivityBarProps {
  onAddWorkspace: () => void
  onHomeClick: () => void
  onCloseWorkspace: (workspaceId: string, isLastWorkspace: boolean) => void
}

export function ActivityBar({ onAddWorkspace, onHomeClick, onCloseWorkspace }: ActivityBarProps) {
  const workspaces = useWorkspaceManagerStore((s) => s.workspaces)
  const workspaceOrder = useWorkspaceManagerStore((s) => s.workspaceOrder)
  const activeWorkspaceId = useWorkspaceManagerStore((s) => s.activeWorkspaceId)
  const switchWorkspace = useWorkspaceManagerStore((s) => s.switchWorkspace)
  const canCreate = useWorkspaceManagerStore((s) => s.canCreateWorkspace())

  // Track which workspace has context menu open (right-click) and position
  const [menuState, setMenuState] = useState<{ id: string; x: number; y: number } | null>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuState) return

    const handleClickOutside = () => setMenuState(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuState])

  // Handle right-click to show context menu
  const handleContextMenu = (e: React.MouseEvent, wsId: string) => {
    e.preventDefault()
    // Position menu to the right of activity bar (60px) at click Y position
    setMenuState({ id: wsId, x: 60, y: Math.min(e.clientY, window.innerHeight - 250) })
  }

  // Handle closing a single workspace
  const handleCloseWorkspace = (wsId: string) => {
    const isLast = workspaceOrder.length === 1
    onCloseWorkspace(wsId, isLast)
    setMenuState(null)
  }

  // Close all workspaces except the specified one
  const handleCloseOthers = (keepWorkspaceId: string) => {
    workspaceOrder.forEach((wsId) => {
      if (wsId !== keepWorkspaceId) {
        onCloseWorkspace(wsId, false)
      }
    })
    setMenuState(null)
  }

  return (
    <aside className='w-12 h-full bg-card border-r border-border flex flex-col items-center py-2 gap-1'>
      {/* Home button */}
      <Button
        variant='ghost'
        size='icon'
        className='w-10 h-10 mb-2'
        onClick={onHomeClick}
        title='Home'
        aria-label='Go to home screen'
      >
        <Home className='h-5 w-5' />
      </Button>

      <div className='w-8 h-px bg-border mb-2' />

      {/* Workspace icons */}
      <div className='flex-1 flex flex-col gap-1 overflow-y-auto'>
        {workspaceOrder.map((wsId) => {
          const ws = workspaces[wsId]
          if (!ws) return null

          return (
            <div key={wsId} className='relative' onContextMenu={(e) => handleContextMenu(e, wsId)}>
              <WorkspaceIcon
                dbType={ws.dbType}
                name={ws.name}
                isActive={wsId === activeWorkspaceId}
                isConnected={ws.isConnected}
                onClick={() => switchWorkspace(wsId)}
              />
              {menuState?.id === wsId && (
                <WorkspaceTooltip
                  workspace={ws}
                  onClose={() => setMenuState(null)}
                  onCloseThis={() => handleCloseWorkspace(wsId)}
                  onCloseOthers={() => handleCloseOthers(wsId)}
                  hasOtherWorkspaces={workspaceOrder.length > 1}
                  position={{ x: menuState.x, y: menuState.y }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Add workspace button */}
      <Button
        variant='ghost'
        size='icon'
        className='w-10 h-10'
        onClick={onAddWorkspace}
        disabled={!canCreate}
        title={canCreate ? 'Add Workspace' : 'Max 5 workspaces'}
        aria-label={canCreate ? 'Add new workspace' : 'Maximum 5 workspaces reached'}
      >
        <Plus className='h-5 w-5' />
      </Button>

      <div className='w-8 h-px bg-border my-2' />

      {/* Settings button */}
      <Button variant='ghost' size='icon' className='w-10 h-10' title='Settings' aria-label='Open settings'>
        <Settings className='h-5 w-5' />
      </Button>
    </aside>
  )
}
