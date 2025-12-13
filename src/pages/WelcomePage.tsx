import { useState } from 'react'

import { WelcomeScreen } from '@/components/Welcome/WelcomeScreen'
import { connectDatabase } from '@/lib/tauri'
import { useConnectionStore } from '@/stores/connectionStore'
import type { Connection } from '@/types/connection'
import { useNavigate } from 'react-router-dom'

export function WelcomePage() {
  const navigate = useNavigate()
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const setActive = useConnectionStore((s) => s.setActive)

  const handleConnect = async (connection: Connection) => {
    setConnecting(true)
    setConnectionError(null)

    try {
      await connectDatabase(connection.path)
      setActive(connection.id)
      navigate('/workspace')
    } catch (err) {
      setConnectionError(String(err))
      console.error('Connection failed:', err)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <>
      <WelcomeScreen onConnect={handleConnect} />
      {connecting && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-[#252526] rounded-xl p-6 flex items-center gap-3'>
            <div className='w-5 h-5 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin' />
            <span className='text-white'>Connecting...</span>
          </div>
        </div>
      )}
      {connectionError && (
        <div className='fixed bottom-4 right-4 bg-rose-500/90 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md'>
          <div className='font-medium'>Connection Failed</div>
          <div className='text-sm opacity-90 mt-1'>{connectionError}</div>
          <button
            onClick={() => setConnectionError(null)}
            className='absolute top-2 right-2 p-1 hover:bg-white/20 rounded'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
