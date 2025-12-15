import { DataGrid } from '@/components/DataGrid/DataGrid'
import { GeneratedSqlBar } from '@/components/DataGrid/GeneratedSqlBar'
import { QueryEditor } from '@/components/QueryEditor/QueryEditor'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'

import { InnerTabBar } from './InnerTabBar'

export function WorkspaceContent() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())

  if (!activeWorkspace?.isConnected) {
    return (
      <div className='flex-1 flex items-center justify-center text-muted-foreground'>
        Not connected. Select a connection to start.
      </div>
    )
  }

  // Table mode hides the SQL editor
  const isTableMode = activeTab?.type === 'table'

  return (
    <div className='flex-1 flex flex-col overflow-hidden'>
      {/* Inner tab bar */}
      <InnerTabBar />

      {/* Content area: Editor (query mode only) + Results */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {!isTableMode && <QueryEditor />}
        {isTableMode && <GeneratedSqlBar />}
        <div className='flex-1 overflow-hidden'>
          <DataGrid />
        </div>
      </div>
    </div>
  )
}
