import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Connection, ConnectionGroup } from '@/types/connection'
import { Folder, MoreHorizontal, Trash2 } from 'lucide-react'

interface ConnectionCardProps {
  connection: Connection
  onConnect: () => void
  onDelete: () => void
  onMoveToGroup?: (groupId: string | null) => void
  availableGroups?: ConnectionGroup[]
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

export function ConnectionCard({
  connection,
  onConnect,
  onDelete,
  onMoveToGroup,
  availableGroups = [],
}: ConnectionCardProps) {
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={(e) => e.stopPropagation()}
              className='h-8 w-8 text-muted-foreground'
            >
              <MoreHorizontal className='h-4 w-4' />
              <span className='sr-only'>More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' onClick={(e) => e.stopPropagation()}>
            {onMoveToGroup && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Folder className='h-4 w-4 mr-2' />
                    Move to Group
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        onMoveToGroup(null)
                      }}
                    >
                      No Group
                    </DropdownMenuItem>
                    {availableGroups.length > 0 && <DropdownMenuSeparator />}
                    {availableGroups.map((group) => (
                      <DropdownMenuItem
                        key={group.id}
                        onSelect={(e) => {
                          e.preventDefault()
                          onMoveToGroup(group.id)
                        }}
                        disabled={connection.groupId === group.id}
                      >
                        {group.color && (
                          <div className='w-2 h-2 rounded-full mr-2' style={{ backgroundColor: group.color }} />
                        )}
                        {group.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                onDelete()
              }}
              className='text-destructive'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
