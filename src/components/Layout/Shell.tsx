import { type ReactNode } from 'react'

import { ActivityBar } from '@/components/ActivityBar'
import { useUiStore } from '@/stores/uiStore'

import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

interface ShellProps {
  children: ReactNode
  onDisconnect?: () => void
  showActivityBar?: boolean
  onAddWorkspace?: () => void
  onHomeClick?: () => void
  onCloseWorkspace?: (workspaceId: string, isLastWorkspace: boolean) => void
}

export function Shell({
  children,
  onDisconnect,
  showActivityBar = true,
  onAddWorkspace = () => {},
  onHomeClick = () => {},
  onCloseWorkspace = () => {},
}: ShellProps) {
  const leftPanelOpen = useUiStore((s) => s.leftPanelOpen)

  return (
    <div className='flex h-screen flex-col overflow-hidden bg-background'>
      <Header onDisconnect={onDisconnect} />
      <div className='flex flex-1 overflow-hidden'>
        {showActivityBar && (
          <ActivityBar onAddWorkspace={onAddWorkspace} onHomeClick={onHomeClick} onCloseWorkspace={onCloseWorkspace} />
        )}
        {leftPanelOpen && <Sidebar />}
        <main className='flex flex-1 flex-col overflow-hidden'>{children}</main>
      </div>
      <StatusBar />
    </div>
  )
}
