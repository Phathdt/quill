import { DataGrid } from '@/components/DataGrid/DataGrid'
import { Shell } from '@/components/Layout/Shell'
import { QueryEditor } from '@/components/QueryEditor/QueryEditor'
import { useConnectionStore } from '@/stores/connectionStore'
import { useNavigate } from 'react-router-dom'

export function WorkspacePage() {
  const navigate = useNavigate()
  const setActive = useConnectionStore((s) => s.setActive)

  const handleDisconnect = () => {
    setActive(null)
    navigate('/')
  }

  return (
    <Shell onDisconnect={handleDisconnect}>
      <QueryEditor />
      <DataGrid />
    </Shell>
  )
}
