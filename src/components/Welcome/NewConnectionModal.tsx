import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface NewConnectionModalProps {
  dbType: 'postgres' | 'sqlite'
  onClose: () => void
  onCreated: () => void
}

const TAG_OPTIONS = [
  { value: 'local', label: 'local', color: 'bg-emerald-500' },
  { value: 'development', label: 'development', color: 'bg-emerald-500' },
  { value: 'staging', label: 'staging', color: 'bg-amber-500' },
  { value: 'production', label: 'production', color: 'bg-rose-500' },
]

const STATUS_COLORS = [
  { value: 'default', color: 'bg-[#3c3c3c]' },
  { value: 'blue', color: 'bg-sky-500' },
  { value: 'yellow', color: 'bg-amber-400' },
  { value: 'green', color: 'bg-emerald-500' },
  { value: 'red', color: 'bg-rose-500' },
]

export function NewConnectionModal({ dbType, onClose, onCreated }: NewConnectionModalProps) {
  const addConnection = useConnectionStore((s) => s.addConnection)

  const [name, setName] = useState('')
  const [statusColor, setStatusColor] = useState('default')
  const [tag, setTag] = useState('local')

  // PostgreSQL fields
  const [host, setHost] = useState('127.0.0.1')
  const [port, setPort] = useState('5432')
  const [user, setUser] = useState('postgres')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState('')

  // SQLite fields
  const [filePath, setFilePath] = useState('')

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState('')

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setTestError('')

    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      const connectionString = buildConnectionString()
      await invoke('connect_database', { connectionString })
      setTestResult('success')
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    } finally {
      setTesting(false)
    }
  }

  const buildConnectionString = () => {
    if (dbType === 'sqlite') {
      return filePath || ':memory:'
    }
    // PostgreSQL
    const userPart = user ? `${user}${password ? `:${password}` : ''}@` : ''
    return `postgresql://${userPart}${host}:${port}/${database}`
  }

  const handleSave = () => {
    const connectionString = buildConnectionString()

    const conn = {
      id: crypto.randomUUID(),
      name: name || (dbType === 'sqlite' ? 'SQLite Database' : `${database || 'postgres'} @ ${host}`),
      path: connectionString,
      type: dbType,
      host: dbType === 'postgres' ? host : undefined,
      port: dbType === 'postgres' ? port : undefined,
      database: dbType === 'postgres' ? database : undefined,
      tag,
      statusColor,
      createdAt: Date.now(),
    }

    addConnection(conn)
    onCreated()
  }

  const handleConnect = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      const connectionString = buildConnectionString()
      await invoke('connect_database', { connectionString })
      handleSave()
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    }
  }

  const title = dbType === 'postgres' ? 'PostgreSQL Connection' : 'SQLite Connection'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Form */}
        <div className='space-y-4 max-h-[60vh] overflow-y-auto'>
          {/* Name */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-muted-foreground'>Name</label>
            <Input type='text' value={name} onChange={(e) => setName(e.target.value)} placeholder='Connection name' />
          </div>

          {/* Status Color & Tag */}
          <div className='flex gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Status color</label>
              <div className='flex gap-1.5'>
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setStatusColor(c.value)}
                    className={cn(
                      'w-7 h-7 rounded-md transition-all',
                      c.color,
                      statusColor === c.value
                        ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                        : 'hover:opacity-80'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className='flex-1 space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Tag</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm'
              >
                {TAG_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {dbType === 'postgres' ? (
            <>
              {/* Host & Port */}
              <div className='flex gap-4'>
                <div className='flex-1 space-y-2'>
                  <label className='text-sm font-medium text-muted-foreground'>Host/Socket</label>
                  <Input type='text' value={host} onChange={(e) => setHost(e.target.value)} placeholder='127.0.0.1' />
                </div>
                <div className='w-24 space-y-2'>
                  <label className='text-sm font-medium text-muted-foreground'>Port</label>
                  <Input type='text' value={port} onChange={(e) => setPort(e.target.value)} placeholder='5432' />
                </div>
              </div>

              {/* User */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>User</label>
                <Input type='text' value={user} onChange={(e) => setUser(e.target.value)} placeholder='postgres' />
              </div>

              {/* Password */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Password</label>
                <Input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='password'
                />
              </div>

              {/* Database */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Database</label>
                <Input
                  type='text'
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder='database name'
                />
              </div>
            </>
          ) : (
            <>
              {/* SQLite File Path */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Database File</label>
                <Input
                  type='text'
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder='/path/to/database.db or :memory:'
                />
                <p className='text-xs text-muted-foreground'>Use :memory: for an in-memory database</p>
              </div>
            </>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg text-sm border',
                testResult === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              )}
            >
              {testResult === 'success' ? (
                <>
                  <CheckCircle2 className='h-4 w-4' />
                  Connection successful!
                </>
              ) : (
                <>
                  <AlertCircle className='h-4 w-4' />
                  Connection failed: {testError}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className='sm:justify-between'>
          <Button variant='ghost' onClick={handleSave}>
            Save
          </Button>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={handleTest} disabled={testing}>
              {testing ? 'Testing...' : 'Test'}
            </Button>
            <Button onClick={handleConnect}>Connect</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
