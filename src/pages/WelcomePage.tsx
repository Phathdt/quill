import { useState } from 'react'

import { invoke } from '@tauri-apps/api/tauri'

import { WelcomeScreen } from '@/components/Welcome/WelcomeScreen'
import { WORKSPACE_ID } from '@/lib/tauri'
import { getErrorMessage } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { Connection } from '@/types/connection'
import { useNavigate } from 'react-router-dom'

export function WelcomePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const connect = useWorkspaceStore((s) => s.connect)
  const setConnected = useWorkspaceStore((s) => s.setConnected)

  const handleConnect = async (connection: Connection) => {
    setError(null)
    connect(connection.id)

    try {
      // Actually connect to database
      await invoke('connect_workspace', {
        workspaceId: WORKSPACE_ID,
        connectionString: connection.path,
      })
      setConnected(true)
      navigate('/workspaces')
    } catch (err) {
      setError(getErrorMessage(err))
      setConnected(false)
    }
  }

  return <WelcomeScreen onConnect={handleConnect} error={error} />
}
