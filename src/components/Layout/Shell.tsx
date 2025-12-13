import { type ReactNode } from 'react'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface ShellProps {
  children: ReactNode
  onDisconnect?: () => void
}

export function Shell({ children, onDisconnect }: ShellProps) {
  return (
    <div className='flex h-screen flex-col overflow-hidden bg-background'>
      <Header onDisconnect={onDisconnect} />
      <div className='flex flex-1 overflow-hidden'>
        <Sidebar />
        <main className='flex flex-1 flex-col overflow-hidden'>{children}</main>
      </div>
    </div>
  )
}
