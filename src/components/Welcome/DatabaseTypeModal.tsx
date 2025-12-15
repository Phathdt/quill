import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import type { Connection } from '@/types/connection'
import { AlertCircle, Link, Search } from 'lucide-react'

interface DatabaseTypeModalProps {
  onSelect: (type: 'postgres' | 'sqlite') => void
  onClose: () => void
  onImportSuccess?: (connection: Connection) => void
}

const DB_TYPES = [
  { id: 'postgres', label: 'PostgreSQL', abbr: 'Pg', color: 'bg-sky-500' },
  { id: 'sqlite', label: 'SQLite', abbr: 'Sl', color: 'bg-violet-500' },
] as const

// Parse PostgreSQL connection URL
function parsePostgresUrl(url: string): {
  valid: boolean
  error?: string
  host?: string
  port?: string
  user?: string
  password?: string
  database?: string
} {
  try {
    // Normalize URL prefix
    const normalizedUrl = url.trim().replace(/^postgres:\/\//, 'postgresql://')

    if (!normalizedUrl.startsWith('postgresql://')) {
      return { valid: false, error: 'URL must start with postgresql:// or postgres://' }
    }

    const parsed = new URL(normalizedUrl)

    const host = parsed.hostname || 'localhost'
    const port = parsed.port || '5432'
    const user = parsed.username || ''
    const password = parsed.password || ''
    const database = parsed.pathname.slice(1) || '' // Remove leading /

    if (!database) {
      return { valid: false, error: 'Database name is required in URL' }
    }

    return {
      valid: true,
      host,
      port,
      user,
      password,
      database,
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

export function DatabaseTypeModal({ onSelect, onClose, onImportSuccess }: DatabaseTypeModalProps) {
  const [selected, setSelected] = useState<'postgres' | 'sqlite'>('postgres')
  const [search, setSearch] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const addConnection = useConnectionStore((s) => s.addConnection)

  const filteredTypes = DB_TYPES.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()))

  const handleImportUrl = () => {
    setImportError(null)

    const result = parsePostgresUrl(importUrl)

    if (!result.valid) {
      setImportError(result.error || 'Invalid URL')
      return
    }

    // Create connection from parsed URL
    const conn: Connection = {
      id: crypto.randomUUID(),
      name: `${result.database} @ ${result.host}`,
      path: importUrl.trim().replace(/^postgres:\/\//, 'postgresql://'),
      type: 'postgres',
      host: result.host,
      port: result.port,
      database: result.database,
      sslConfig: { mode: 'disable' },
      tag: 'local',
      statusColor: 'default',
      createdAt: Date.now(),
    }

    addConnection(conn)
    setShowImportDialog(false)
    onClose()
    onImportSuccess?.(conn)
  }

  // Show import URL dialog
  if (showImportDialog) {
    return (
      <Dialog open onOpenChange={() => setShowImportDialog(false)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Import from URL</DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Connection URL</label>
              <Textarea
                value={importUrl}
                onChange={(e) => {
                  setImportUrl(e.target.value)
                  setImportError(null)
                }}
                placeholder='postgresql://user:password@host:5432/database'
                className='font-mono text-sm min-h-[80px]'
                autoFocus
              />
              <p className='text-xs text-muted-foreground'>
                Supported format: postgresql://user:password@host:port/database
              </p>
            </div>

            {importError && (
              <div className='flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20'>
                <AlertCircle className='h-4 w-4 flex-shrink-0' />
                {importError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant='ghost' onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportUrl} disabled={!importUrl.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Select Database Type</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search database types...'
            autoFocus
            className='pl-9'
          />
        </div>

        {/* Database Types Grid */}
        <div className='grid grid-cols-4 gap-3 py-4'>
          {filteredTypes.map((db) => (
            <button
              key={db.id}
              onClick={() => setSelected(db.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl transition-all',
                selected === db.id ? 'bg-accent ring-2 ring-primary' : 'hover:bg-accent'
              )}
            >
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg',
                  db.color
                )}
              >
                {db.abbr}
              </div>
              <span className='text-sm text-foreground'>{db.label}</span>
            </button>
          ))}

          {/* Coming Soon Placeholders */}
          {['MySQL', 'DuckDB'].map((name) => (
            <div key={name} className='flex flex-col items-center gap-2 p-4 opacity-40 cursor-not-allowed'>
              <div className='w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg'>
                ?
              </div>
              <span className='text-sm text-muted-foreground'>{name}</span>
            </div>
          ))}
        </div>

        <DialogFooter className='sm:justify-between'>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => setShowImportDialog(true)}>
              <Link className='h-4 w-4 mr-2' />
              Import from URL
            </Button>
            <Button onClick={() => onSelect(selected)}>Create</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
