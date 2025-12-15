import { useState } from 'react'

import { Shell } from '@/components/Layout/Shell'
import { Button } from '@/components/ui/button'
import { ConnectModal, WorkspaceContent } from '@/components/Workspace'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Database } from 'lucide-react'

export function WorkspacePage() {
  const [showConnectModal, setShowConnectModal] = useState(false)
  const isConnected = useWorkspaceStore((s) => s.isConnected)

  return (
    <Shell>
      <div className='flex flex-col h-full'>
        {isConnected ? <WorkspaceContent /> : <EmptyState onConnect={() => setShowConnectModal(true)} />}
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
