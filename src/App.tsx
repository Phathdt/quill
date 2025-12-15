import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { WelcomePage, WorkspacePage } from '@/pages'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

function AppContent() {
  useGlobalShortcuts()

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
      <AppContent />
    </BrowserRouter>
  )
}

export default App
