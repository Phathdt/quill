import { WelcomeScreen } from '@/components/Welcome/WelcomeScreen'
import { useWorkspaceConnection } from '@/hooks'
import type { Connection } from '@/types/connection'
import { useNavigate } from 'react-router-dom'

export function WelcomePage() {
  const navigate = useNavigate()
  const { connect, connectError } = useWorkspaceConnection()

  const handleConnect = async (connection: Connection) => {
    const success = await connect(connection)
    if (success) {
      navigate('/workspaces')
    }
  }

  return <WelcomeScreen onConnect={handleConnect} error={connectError} />
}
