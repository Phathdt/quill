import { useEffect } from 'react'

import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { WelcomePage, WorkspacePage } from '@/pages'
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
  useGlobalShortcuts()

  // Clear stale data on mount
  useEffect(() => {
    clearStaleWorkspaceData()
  }, [])

  return (
    <Routes>
      <Route path='/' element={<WelcomePage />} />
      <Route path='/workspaces' element={<WorkspacePage />} />
      <Route path='/workspaces/:workspaceId' element={<WorkspacePage />} />
      {/* Redirect old route */}
      <Route path='/workspace' element={<Navigate to='/workspaces' replace />} />
    </Routes>
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
