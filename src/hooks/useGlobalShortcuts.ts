import { formatSql } from '@/lib/sql-formatter'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import { useHotkeys } from 'react-hotkeys-hook'

export function useGlobalShortcuts() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const closeTab = useWorkspaceManagerStore((s) => s.closeTab)
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)

  // Cmd+T: Create new tab
  useHotkeys(
    'meta+t',
    (e) => {
      e.preventDefault()
      if (activeWorkspace) {
        createTab(activeWorkspace.id, 'query', 'SQL Query')
      }
    },
    { enableOnFormTags: true }
  )

  // Cmd+W: Close current tab (prevent if only 1 tab)
  useHotkeys(
    'meta+w',
    (e) => {
      e.preventDefault()
      if (activeWorkspace && activeTab && activeWorkspace.tabOrder.length > 1) {
        closeTab(activeWorkspace.id, activeTab.id)
      }
    },
    { enableOnFormTags: true }
  )

  // Cmd+Shift+F: Format SQL
  useHotkeys(
    'meta+shift+f',
    (e) => {
      e.preventDefault()
      if (activeWorkspace && activeTab?.sql) {
        const dbType = activeWorkspace.dbType
        const language = dbType === 'postgres' ? 'postgresql' : 'sqlite'
        const formatted = formatSql(activeTab.sql, language)
        setTabSql(activeWorkspace.id, activeTab.id, formatted)
      }
    },
    { enableOnFormTags: true }
  )
}
