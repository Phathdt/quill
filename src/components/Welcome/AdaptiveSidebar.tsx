import { Separator } from '@/components/ui/separator'
import type { Connection } from '@/types/connection'
import { Clock, Zap } from 'lucide-react'

import { QuickActions } from './QuickActions'
import { RecentConnections } from './RecentConnections'

interface AdaptiveSidebarProps {
  onConnect: (connection: Connection) => void
  onCreateConnection: () => void
}

export function AdaptiveSidebar({ onConnect, onCreateConnection }: AdaptiveSidebarProps) {
  return (
    <aside className='w-72 bg-card border-r border-border flex flex-col'>
      {/* Logo Area */}
      <div className='flex flex-col items-center p-6 border-b border-border'>
        <div className='w-20 h-20 mb-3'>
          <img src='/icon.png' alt='Quill' className='w-full h-full object-contain' />
        </div>
        <h1 className='text-2xl font-bold text-foreground tracking-tight'>Quill</h1>
        <p className='text-muted-foreground text-xs mt-1'>Write data, beautifully</p>
      </div>

      {/* Recent Connections */}
      <div className='flex-1 overflow-auto'>
        <div className='p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <Clock className='w-4 h-4 text-muted-foreground' />
            <span className='text-sm font-medium text-muted-foreground'>Recent</span>
          </div>
          <RecentConnections onConnect={onConnect} />
        </div>

        <Separator className='mx-4' />

        {/* Quick Actions */}
        <div className='p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <Zap className='w-4 h-4 text-muted-foreground' />
            <span className='text-sm font-medium text-muted-foreground'>Quick Actions</span>
          </div>
          <QuickActions onCreateConnection={onCreateConnection} />
        </div>
      </div>

      {/* Version footer */}
      <div className='p-4 border-t border-border'>
        <p className='text-muted-foreground/50 text-xs text-center'>Version 0.1.0</p>
      </div>
    </aside>
  )
}
