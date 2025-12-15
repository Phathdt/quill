import { useMemo } from 'react'

import { useConnectionStore } from '@/stores/connectionStore'
import type { Connection } from '@/types/connection'
import { Clock, Database } from 'lucide-react'

interface RecentConnectionsProps {
  onConnect: (connection: Connection) => void
}

const DB_COLORS: Record<string, string> = {
  postgres: 'bg-sky-500',
  sqlite: 'bg-violet-500',
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function RecentConnections({ onConnect }: RecentConnectionsProps) {
  const connections = useConnectionStore((s) => s.connections)

  const recentConnections = useMemo(() => {
    return [...connections]
      .filter((c) => c.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
      .slice(0, 5)
  }, [connections])

  if (recentConnections.length === 0) {
    return (
      <div className='text-sm text-muted-foreground text-center py-4'>
        <Clock className='w-8 h-8 mx-auto mb-2 opacity-50' />
        <p>No recent connections</p>
      </div>
    )
  }

  return (
    <div className='space-y-1'>
      {recentConnections.map((conn) => (
        <button
          key={conn.id}
          onClick={() => onConnect(conn)}
          className='w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors text-left'
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center ${DB_COLORS[conn.type] || 'bg-muted'}`}
          >
            <Database className='w-3 h-3 text-white' />
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium truncate'>{conn.name}</p>
            <p className='text-xs text-muted-foreground'>
              {conn.lastUsedAt ? formatRelativeTime(conn.lastUsedAt) : 'Never used'}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
