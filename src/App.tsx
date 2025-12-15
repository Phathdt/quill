import { WelcomePage, WorkspacePage } from '@/pages'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<WelcomePage />} />
        <Route path='/workspaces' element={<WorkspacePage />} />
        <Route path='/workspaces/:workspaceId' element={<WorkspacePage />} />
        {/* Redirect old route */}
        <Route path='/workspace' element={<Navigate to='/workspaces' replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
