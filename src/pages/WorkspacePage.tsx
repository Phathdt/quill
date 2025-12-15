import { useState } from 'react'

import { Shell } from '@/components/Layout/Shell'
import { Button } from '@/components/ui/button'
import { ConnectModal, WorkspaceContent } from '@/components/Workspace'
import { disconnectWorkspace } from '@/lib/tauri'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function WorkspacePage() {
  const navigate = useNavigate()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const closeWorkspace = useWorkspaceManagerStore((s) => s.closeWorkspace)

  // Close a specific workspace (from ActivityBar context menu)
  const handleCloseWorkspace = async (workspaceId: string, isLastWorkspace: boolean) => {
    try {
      await disconnectWorkspace(workspaceId)
    } catch {
      // Ignore disconnect errors
    }
    closeWorkspace(workspaceId)

    // If last workspace closed, go to welcome
    if (isLastWorkspace) {
      navigate('/')
    }
  }

  // Close active workspace (from Header disconnect button)
  const handleDisconnect = async () => {
    if (!activeWorkspace) return
    const workspaceCount = useWorkspaceManagerStore.getState().workspaceOrder.length
    await handleCloseWorkspace(activeWorkspace.id, workspaceCount <= 1)
  }

  const handleHomeClick = () => {
    navigate('/')
  }

  return (
    <Shell
      onDisconnect={handleDisconnect}
      showActivityBar={true}
      onAddWorkspace={() => setShowConnectModal(true)}
      onHomeClick={handleHomeClick}
      onCloseWorkspace={handleCloseWorkspace}
    >
      <div className='flex flex-col h-full'>
        {activeWorkspace?.isConnected ? (
          <WorkspaceContent />
        ) : (
          <EmptyState onConnect={() => setShowConnectModal(true)} />
        )}
      </div>

      <ConnectModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </Shell>
  )
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className='flex-1 flex flex-col items-center justify-center text-center p-8 bg-background'>
      <Database className='w-16 h-16 mb-4 text-muted-foreground opacity-50' strokeWidth={1} />
      <h2 className='text-xl font-semibold mb-2'>Connect to a Database</h2>
      <p className='text-muted-foreground mb-4'>Select a connection to start querying</p>
      <Button onClick={onConnect} variant='default'>
        Connect
      </Button>
    </div>
  )
}
