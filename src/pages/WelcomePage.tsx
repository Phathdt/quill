import { useState } from 'react'

import { invoke } from '@tauri-apps/api/tauri'

import { WelcomeScreen } from '@/components/Welcome/WelcomeScreen'
import { getErrorMessage } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { Connection } from '@/types/connection'
import { useNavigate } from 'react-router-dom'

export function WelcomePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const createWorkspace = useWorkspaceManagerStore((s) => s.createWorkspace)
  const closeWorkspace = useWorkspaceManagerStore((s) => s.closeWorkspace)
  const setWorkspaceConnected = useWorkspaceManagerStore((s) => s.setWorkspaceConnected)
  const workspaceCount = useWorkspaceManagerStore((s) => s.workspaceOrder.length)

  const handleConnect = async (connection: Connection) => {
    setError(null)

    // Create new workspace
    const workspaceId = createWorkspace(connection)
    if (!workspaceId) {
      setError(`Maximum 5 workspaces allowed (currently ${workspaceCount} open). Close some workspaces first.`)
      return
    }

    try {
      await invoke('connect_workspace', {
        workspaceId,
        options: {
          connectionString: connection.path,
          sslConfig: connection.sslConfig,
        },
      })
      setWorkspaceConnected(workspaceId, true)
      navigate('/workspaces')
    } catch (err) {
      // Clean up the workspace if connection failed
      closeWorkspace(workspaceId)
      setError(getErrorMessage(err))
    }
  }

  return <WelcomeScreen onConnect={handleConnect} error={error} />
}
