import { DataGrid } from '@/components/DataGrid/DataGrid'
import { GeneratedSqlBar } from '@/components/DataGrid/GeneratedSqlBar'
import { RecordDetailSidebar } from '@/components/DataGrid/RecordDetailSidebar'
import { QueryEditor } from '@/components/QueryEditor/QueryEditor'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'

import { EmptyState } from './EmptyState'
import { InnerTabBar } from './InnerTabBar'

export function WorkspaceContent() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const sqlBarOpen = useUiStore((s) => s.sqlBarOpen)

  // Handler for creating new tab from empty state
  const handleCreateTab = () => {
    if (activeWorkspace) {
      createTab(activeWorkspace.id, 'query', 'SQL Query')
    }
  }

  // Show empty state when not connected OR when no active tab
  if (!activeWorkspace?.isConnected || !activeTab) {
    return <EmptyState onCreateTab={handleCreateTab} />
  }

  // Table mode hides the SQL editor
  const isTableMode = activeTab?.type === 'table'
  const sidebarState = activeTab?.sidebarState

  return (
    <div className='flex-1 flex overflow-hidden'>
      {/* Main content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Inner tab bar */}
        <InnerTabBar />

        {/* Content area: Editor (query mode only) + Results */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          {!isTableMode && <QueryEditor />}
          <div className='flex-1 overflow-hidden'>
            <DataGrid />
          </div>
          {/* SQL bar at bottom - toggled via Code button in GridToolbar */}
          {isTableMode && sqlBarOpen && <GeneratedSqlBar />}
        </div>
      </div>

      {/* Sidebar panel */}
      {sidebarState?.isOpen && sidebarState.mode === 'record' && <RecordDetailSidebar />}
    </div>
  )
}
