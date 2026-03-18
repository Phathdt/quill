import { useEffect } from 'react'

import { CommandPalette } from '@/components/CommandPalette/CommandPalette'
import { TableFinderModal } from '@/components/TableFinder/TableFinderModal'
import { KeyboardShortcutsOverlay } from '@/components/Layout/KeyboardShortcutsOverlay'
import { SaveQueryDialog } from '@/components/SavedQueries/SaveQueryDialog'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { disconnectAllWorkspaces } from '@/lib/tauri'
import { WelcomePage, WorkspacePage } from '@/pages'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

// Clear any stale workspace data from previous versions
function clearStaleWorkspaceData() {
  console.log('[App] Checking localStorage for stale data...')
  console.log('[App] All localStorage keys:', Object.keys(localStorage))

  // Log all workspace-related keys
  Object.keys(localStorage).forEach((key) => {
    if (key.toLowerCase().includes('workspace')) {
      const value = localStorage.getItem(key)
      console.log(`[App] Found workspace key: ${key}`, value?.substring(0, 200))
    }
  })

  const keysToRemove = ['workspace-manager-storage', 'workspace-storage']
  keysToRemove.forEach((key) => {
    if (localStorage.getItem(key)) {
      console.log(`[App] Clearing stale data: ${key}`)
      localStorage.removeItem(key)
    }
  })

  console.log('[App] Cleanup complete')
}

function AppContent() {
  const { shortcutsOpen, setShortcutsOpen, saveDialogOpen, setSaveDialogOpen } = useGlobalShortcuts()
  const workspaceOrder = useWorkspaceManagerStore((s) => s.workspaceOrder)
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())

  // Clear stale data on mount
  useEffect(() => {
    clearStaleWorkspaceData()
  }, [])

  // Cleanup connections when app closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Disconnect all active workspaces
      if (workspaceOrder.length > 0) {
        disconnectAllWorkspaces(workspaceOrder)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Also disconnect when component unmounts
      handleBeforeUnload()
    }
  }, [workspaceOrder])

  return (
    <>
      <Routes>
        <Route path='/' element={<WelcomePage />} />
        <Route path='/workspaces' element={<WorkspacePage />} />
        <Route path='/workspaces/:connectionId' element={<WorkspacePage />} />
        {/* Redirect old route */}
        <Route path='/workspace' element={<Navigate to='/workspaces' replace />} />
      </Routes>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Table Finder (Cmd+P) */}
      <TableFinderModal />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Global Save Query Dialog (triggered by Cmd+Shift+S) */}
      <SaveQueryDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        sql={activeTab?.sql ?? ''}
        connectionType={activeWorkspace?.dbType}
      />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position='bottom-right' richColors />
      <AppContent />
    </BrowserRouter>
  )
}

export default App
