import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import { ChevronLeft } from 'lucide-react'

interface HeaderProps {
  onDisconnect?: () => void
}

const DB_BADGES: Record<string, { bg: string; label: string }> = {
  postgres: { bg: 'bg-sky-500', label: 'Pg' },
  sqlite: { bg: 'bg-violet-500', label: 'Sl' },
}

export function Header({ onDisconnect }: HeaderProps) {
  const activeId = useConnectionStore((s) => s.activeId)
  const connections = useConnectionStore((s) => s.connections)
  const active = connections.find((c) => c.id === activeId)

  const badge = active ? DB_BADGES[active.type] || DB_BADGES.postgres : null

  return (
    <header className='flex h-12 items-center border-b border-border bg-card px-4 gap-3'>
      {/* Back button */}
      {onDisconnect && (
        <Button variant='ghost' size='icon' onClick={onDisconnect} className='h-8 w-8'>
          <ChevronLeft className='h-5 w-5' />
          <span className='sr-only'>Back to connections</span>
        </Button>
      )}

      {/* Logo */}
      <div className='flex items-center gap-2'>
        <span className='text-xl'>🪶</span>
        <h1 className='text-lg font-semibold text-foreground'>Quill</h1>
      </div>

      {/* Divider */}
      <Separator orientation='vertical' className='h-6' />

      {/* Connection info */}
      {active && badge && (
        <div className='flex items-center gap-2'>
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs',
              badge.bg
            )}
          >
            {badge.label}
          </div>
          <span className='text-sm text-foreground'>{active.name}</span>
          {active.database && (
            <>
              <span className='text-muted-foreground'>:</span>
              <span className='text-sm text-muted-foreground'>{active.database}</span>
            </>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className='flex-1' />

      {/* Connection status */}
      <Badge variant='outline' className='text-emerald-400 border-emerald-400/30'>
        <div className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2' />
        Connected
      </Badge>
    </header>
  )
}
