import { WelcomePage, WorkspacePage } from '@/pages'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<WelcomePage />} />
        <Route path='/workspace' element={<WorkspacePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
