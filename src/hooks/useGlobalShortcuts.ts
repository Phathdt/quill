import { useState } from 'react'

import { formatSql } from '@/lib/sql-formatter'
import { useTableFinderStore } from '@/stores/tableFinderStore'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { useHotkeys } from 'react-hotkeys-hook'

export function useGlobalShortcuts() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const toggleTableFinder = useTableFinderStore((s) => s.toggle)
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const createTab = useWorkspaceManagerStore((s) => s.createTab)
  const closeTab = useWorkspaceManagerStore((s) => s.closeTab)
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)
  const setSidebarOpen = useWorkspaceManagerStore((s) => s.setSidebarOpen)
  const setSidebarRowIndex = useWorkspaceManagerStore((s) => s.setSidebarRowIndex)
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel)

  // Cmd/Ctrl+P: Open table finder (only when connected)
  useHotkeys(
    'meta+p, ctrl+p',
    (e) => {
      e.preventDefault()
      if (activeWorkspace?.isConnected) {
        toggleTableFinder()
      }
    },
    { enableOnFormTags: true }
  )

  // Cmd/Ctrl+T: Create new tab
  useHotkeys(
    'meta+t, ctrl+t',
    (e) => {
      e.preventDefault()
      if (activeWorkspace) {
        createTab(activeWorkspace.id, 'query', 'SQL Query')
      }
    },
    { enableOnFormTags: true }
  )

  // Cmd/Ctrl+W: Close current tab (prevent if only 1 tab)
  useHotkeys(
    'meta+w, ctrl+w',
    (e) => {
      e.preventDefault()
      if (activeWorkspace && activeTab && activeWorkspace.tabOrder.length > 1) {
        closeTab(activeWorkspace.id, activeTab.id)
      }
    },
    { enableOnFormTags: true }
  )

  // Cmd/Ctrl+B: Toggle left panel
  useHotkeys(
    'meta+b, ctrl+b',
    (e) => {
      e.preventDefault()
      toggleLeftPanel()
    },
    { enableOnFormTags: true }
  )

  // Cmd/Ctrl+Shift+F: Format SQL
  useHotkeys(
    'meta+shift+f, ctrl+shift+f',
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

  // Cmd/Ctrl+D: Toggle record detail sidebar
  useHotkeys(
    'meta+d, ctrl+d',
    (e) => {
      e.preventDefault()
      if (activeWorkspace && activeTab && activeTab.result?.rows.length) {
        const sidebarState = activeTab.sidebarState
        if (sidebarState?.isOpen && sidebarState.mode === 'record') {
          setSidebarOpen(activeWorkspace.id, activeTab.id, false)
        } else {
          // If opening and no row selected, select first row
          if (sidebarState?.selectedRowIndex === null) {
            setSidebarRowIndex(activeWorkspace.id, activeTab.id, 0)
          }
          setSidebarOpen(activeWorkspace.id, activeTab.id, true, 'record')
        }
      }
    },
    { enableOnFormTags: true }
  )

  // F1: Show keyboard shortcuts overlay
  useHotkeys(
    'f1',
    (e) => {
      e.preventDefault()
      setShortcutsOpen((prev) => !prev)
    },
    { enableOnFormTags: false, enableOnContentEditable: false }
  )

  // Cmd/Ctrl+Shift+S: Save query
  useHotkeys(
    'meta+shift+s, ctrl+shift+s',
    (e) => {
      e.preventDefault()
      if (activeTab?.sql?.trim()) {
        setSaveDialogOpen(true)
      }
    },
    { enableOnFormTags: true }
  )

  return { shortcutsOpen, setShortcutsOpen, saveDialogOpen, setSaveDialogOpen }
}
