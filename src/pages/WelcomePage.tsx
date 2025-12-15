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
  const setWorkspaceConnected = useWorkspaceManagerStore((s) => s.setWorkspaceConnected)

  const handleConnect = async (connection: Connection) => {
    setError(null)

    // Create new workspace
    const workspaceId = createWorkspace(connection)
    if (!workspaceId) {
      setError('Maximum 5 workspaces allowed')
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
      setError(getErrorMessage(err))
      setWorkspaceConnected(workspaceId, false)
    }
  }

  return <WelcomeScreen onConnect={handleConnect} error={error} />
}
