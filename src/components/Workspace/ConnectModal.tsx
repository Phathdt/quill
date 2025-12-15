import { useState } from 'react'

import { invoke } from '@tauri-apps/api/tauri'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getErrorMessage } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { Database, Loader2 } from 'lucide-react'

interface ConnectModalProps {
  open: boolean
  onClose: () => void
}

export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connections = useConnectionStore((s) => s.connections)
  const createWorkspace = useWorkspaceManagerStore((s) => s.createWorkspace)
  const setWorkspaceConnected = useWorkspaceManagerStore((s) => s.setWorkspaceConnected)

  const handleSelect = async (connectionId: string) => {
    const connection = connections.find((c) => c.id === connectionId)
    if (!connection) return

    setLoading(connectionId)
    setError(null)

    // Create new workspace
    const workspaceId = createWorkspace(connection)
    if (!workspaceId) {
      setError('Maximum 5 workspaces allowed')
      setLoading(null)
      return
    }

    try {
      await invoke('connect_workspace', {
        workspaceId,
        connectionString: connection.path,
      })
      setWorkspaceConnected(workspaceId, true)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
      setWorkspaceConnected(workspaceId, false)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Connect to Database</DialogTitle>
        </DialogHeader>

        {error && <div className='text-sm text-destructive bg-destructive/10 p-2 rounded'>{error}</div>}

        <div className='space-y-2'>
          {connections.length === 0 ? (
            <p className='text-sm text-muted-foreground text-center py-4'>
              No connections available. Create a connection first.
            </p>
          ) : (
            connections.map((conn) => (
              <Button
                key={conn.id}
                variant='outline'
                className='w-full justify-start'
                onClick={() => handleSelect(conn.id)}
                disabled={loading !== null}
              >
                {loading === conn.id ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Database className='mr-2 h-4 w-4' />
                )}
                <span className='truncate flex-1 text-left'>{conn.name}</span>
                <Badge variant='secondary' className='ml-2'>
                  {conn.type === 'postgres' ? 'Pg' : 'Sl'}
                </Badge>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
