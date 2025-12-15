import { DataGrid } from '@/components/DataGrid/DataGrid'
import { QueryEditor } from '@/components/QueryEditor/QueryEditor'
import { useWorkspaceStore } from '@/stores/workspaceStore'

import { InnerTabBar } from './InnerTabBar'

export function WorkspaceContent() {
  const isConnected = useWorkspaceStore((s) => s.isConnected)

  if (!isConnected) {
    return (
      <div className='flex-1 flex items-center justify-center text-muted-foreground'>
        Not connected. Select a connection to start.
      </div>
    )
  }

  return (
    <div className='flex-1 flex flex-col overflow-hidden'>
      {/* Inner tab bar */}
      <InnerTabBar />

      {/* Content area: Editor + Results */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        <QueryEditor />
        <div className='flex-1 overflow-hidden'>
          <DataGrid />
        </div>
      </div>
    </div>
  )
}
