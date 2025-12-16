import { cn } from '@/lib/utils'
import { DB_COLORS, type DbType } from '@/types/workspace'

interface WorkspaceIconProps {
  dbType: DbType
  name: string
  isActive: boolean
  isConnected: boolean
  onClick: () => void
}

// DB type abbreviations
const DB_LABELS: Record<DbType, string> = {
  postgres: 'Pg',
  sqlite: 'Sl',
  mysql: 'My',
}

export function WorkspaceIcon({ dbType, name, isActive, isConnected, onClick }: WorkspaceIconProps) {
  const bgColor = DB_COLORS[dbType]
  const label = DB_LABELS[dbType]

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-10 h-10 rounded-lg flex items-center justify-center',
        'transition-all duration-150 group',
        isActive ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'
      )}
      title={name}
      aria-label={`Switch to ${name} workspace (${dbType})`}
      aria-current={isActive ? 'true' : undefined}
    >
      {/* Icon circle */}
      <div
        className='w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs'
        style={{ backgroundColor: bgColor }}
      >
        {label}
      </div>

      {/* Active indicator (left border) */}
      {isActive && <div className='absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r' />}

      {/* Connection status dot */}
      <div
        className={cn(
          'absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background',
          isConnected ? 'bg-emerald-400' : 'bg-gray-400'
        )}
      />
    </button>
  )
}
