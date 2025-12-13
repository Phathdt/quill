import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Connection } from '@/types/connection'
import { Trash2 } from 'lucide-react'

interface ConnectionCardProps {
  connection: Connection
  onConnect: () => void
  onDelete: () => void
}

const TAG_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  local: 'default',
  development: 'default',
  staging: 'secondary',
  production: 'destructive',
  default: 'outline',
}

const DB_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  postgres: { bg: 'bg-sky-500', text: 'text-white', label: 'Pg' },
  sqlite: { bg: 'bg-violet-500', text: 'text-white', label: 'Sl' },
}

export function ConnectionCard({ connection, onConnect, onDelete }: ConnectionCardProps) {
  const badge = DB_BADGES[connection.type] || DB_BADGES.postgres
  const tagVariant = TAG_VARIANTS[connection.tag || 'default'] || TAG_VARIANTS.default

  const getConnectionInfo = () => {
    if (connection.type === 'sqlite') {
      return connection.path || 'In-memory'
    }
    const host = connection.host || 'localhost'
    const db = connection.database || ''
    return `${host}${db ? ` : ${db}` : ''}`
  }

  return (
    <div
      className='group flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors'
      onClick={onConnect}
    >
      {/* Database Type Badge */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
          badge.bg,
          badge.text
        )}
      >
        {badge.label}
      </div>

      {/* Connection Info */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='font-medium text-foreground truncate'>{connection.name}</span>
          {connection.tag && (
            <Badge variant={tagVariant} className='text-xs'>
              {connection.tag}
            </Badge>
          )}
        </div>
        <div className='text-sm text-muted-foreground truncate'>{getConnectionInfo()}</div>
      </div>

      {/* Actions */}
      <div className='opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity'>
        <Button
          variant='ghost'
          size='icon'
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className='h-8 w-8 text-muted-foreground hover:text-destructive'
        >
          <Trash2 className='h-4 w-4' />
          <span className='sr-only'>Delete connection</span>
        </Button>
      </div>
    </div>
  )
}
