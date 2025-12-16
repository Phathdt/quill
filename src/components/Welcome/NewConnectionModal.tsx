import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { invoke } from '@tauri-apps/api/tauri'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS_COLORS, TAG_OPTIONS } from '@/lib/const'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import type { SslConfig } from '@/types/connection'
import type { SshTunnelConfig } from '@/types/ssh'
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { CreateGroupDialog } from './CreateGroupDialog'
import { SslConfigForm } from './SslConfigForm'

import { SshConfigForm } from '../Workspace/SshConfigForm'

interface NewConnectionModalProps {
  dbType: 'postgres' | 'sqlite' | 'mysql'
  onClose: () => void
  onCreated: () => void
}

// PostgreSQL specific schema
const postgresSchema = z.object({
  name: z.string().optional(),
  statusColor: z.string(),
  tag: z.string(),
  groupId: z.string().optional(),
  host: z.string().min(1, 'Host is required'),
  port: z.string().regex(/^\d+$/, 'Port must be a number'),
  user: z.string(),
  password: z.string().optional(),
  database: z.string().min(1, 'Database name is required'),
})

// MySQL specific schema
const mysqlSchema = z.object({
  name: z.string().optional(),
  statusColor: z.string(),
  tag: z.string(),
  groupId: z.string().optional(),
  host: z.string().min(1, 'Host is required'),
  port: z.string().regex(/^\d+$/, 'Port must be a number'),
  user: z.string(),
  password: z.string().optional(),
  database: z.string().min(1, 'Database name is required'),
})

// SQLite specific schema
const sqliteSchema = z.object({
  name: z.string().optional(),
  statusColor: z.string(),
  tag: z.string(),
  groupId: z.string().optional(),
  filePath: z.string().min(1, 'File path is required'),
})

type PostgresFormData = z.infer<typeof postgresSchema>
type MysqlFormData = z.infer<typeof mysqlSchema>
type SqliteFormData = z.infer<typeof sqliteSchema>

export function NewConnectionModal({ dbType, onClose, onCreated }: NewConnectionModalProps) {
  if (dbType === 'postgres') {
    return <PostgresConnectionForm onClose={onClose} onCreated={onCreated} />
  }
  if (dbType === 'mysql') {
    return <MysqlConnectionForm onClose={onClose} onCreated={onCreated} />
  }
  return <SqliteConnectionForm onClose={onClose} onCreated={onCreated} />
}

interface ConnectionFormProps {
  onClose: () => void
  onCreated: () => void
}

function PostgresConnectionForm({ onClose, onCreated }: ConnectionFormProps) {
  const addConnection = useConnectionStore((s) => s.addConnection)
  const groups = useConnectionStore((s) => s.groups)
  const groupOrder = useConnectionStore((s) => s.groupOrder)

  const [sslConfig, setSslConfig] = useState<SslConfig>({ mode: 'disable' })
  const [sshConfig, setSshConfig] = useState<SshTunnelConfig | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<PostgresFormData>({
    resolver: zodResolver(postgresSchema),
    defaultValues: {
      name: '',
      statusColor: 'default',
      tag: 'local',
      groupId: undefined,
      host: '127.0.0.1',
      port: '5432',
      user: 'postgres',
      password: '',
      database: '',
    },
    mode: 'onChange',
  })

  const statusColor = watch('statusColor')
  const tag = watch('tag')
  const groupId = watch('groupId')

  const buildConnectionString = (data: PostgresFormData) => {
    const userPart = data.user ? `${data.user}${data.password ? `:${data.password}` : ''}@` : ''
    return `postgresql://${userPart}${data.host}:${data.port}/${data.database}`
  }

  const handleTest = async () => {
    const data = getValues()
    setTesting(true)
    setTestResult(null)
    setTestError('')

    try {
      const connectionString = buildConnectionString(data)
      const options = { connectionString, sslConfig }
      await invoke('test_connection', { options })
      setTestResult('success')
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    } finally {
      setTesting(false)
    }
  }

  const saveConnection = (data: PostgresFormData) => {
    const connectionString = buildConnectionString(data)

    const conn = {
      id: crypto.randomUUID(),
      name: data.name || `${data.database || 'postgres'} @ ${data.host}`,
      path: connectionString,
      type: 'postgres' as const,
      host: data.host,
      port: data.port,
      database: data.database,
      sslConfig,
      sshConfig: sshConfig ?? undefined,
      tag: data.tag,
      statusColor: data.statusColor,
      groupId: data.groupId || undefined,
      createdAt: Date.now(),
    }

    addConnection(conn)
    onCreated()
  }

  const handleConnect = async () => {
    const data = getValues()
    try {
      const connectionString = buildConnectionString(data)
      const options = { connectionString, sslConfig }
      await invoke('test_connection', { options })
      saveConnection(data)
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>PostgreSQL Connection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(saveConnection)}>
          <div className='space-y-4 max-h-[60vh] overflow-y-auto'>
            {/* Name */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Name</label>
              <Input {...register('name')} placeholder='Connection name' />
            </div>

            {/* Status Color & Tag */}
            <div className='flex gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Status color</label>
                <div className='flex gap-1.5'>
                  {STATUS_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type='button'
                      onClick={() => setValue('statusColor', c.value)}
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
                <Select value={tag} onValueChange={(value) => setValue('tag', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select tag' />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group Selection */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Group</label>
              <div className='flex gap-2'>
                <Select
                  value={groupId || '__none__'}
                  onValueChange={(value) => setValue('groupId', value === '__none__' ? undefined : value)}
                >
                  <SelectTrigger className='flex-1'>
                    <SelectValue placeholder='No group' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__none__'>No group</SelectItem>
                    {groupOrder.map((gId) => {
                      const group = groups[gId]
                      return (
                        <SelectItem key={gId} value={gId}>
                          {group?.name || 'Unnamed Group'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button type='button' variant='outline' size='icon' onClick={() => setShowCreateGroup(true)}>
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
            </div>

            {/* Host & Port */}
            <div className='flex gap-4'>
              <div className='flex-1 space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Host/Socket</label>
                <Input {...register('host')} placeholder='127.0.0.1' />
                {errors.host && <p className='text-xs text-destructive'>{errors.host.message}</p>}
              </div>
              <div className='w-24 space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Port</label>
                <Input {...register('port')} placeholder='5432' />
                {errors.port && <p className='text-xs text-destructive'>{errors.port.message}</p>}
              </div>
            </div>

            {/* User */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>User</label>
              <Input {...register('user')} placeholder='postgres' />
            </div>

            {/* Password */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Password</label>
              <Input type='password' {...register('password')} placeholder='password' />
            </div>

            {/* Database */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Database</label>
              <Input {...register('database')} placeholder='database name' />
              {errors.database && <p className='text-xs text-destructive'>{errors.database.message}</p>}
            </div>

            {/* SSL Configuration */}
            <div className='space-y-3 pt-2 border-t border-border'>
              <h4 className='text-sm font-medium'>SSL/TLS</h4>
              <SslConfigForm config={sslConfig} onConfigChange={setSslConfig} isPostgres={true} />
            </div>

            {/* SSH Tunnel Configuration */}
            <div className='space-y-3 pt-2 border-t border-border'>
              <h4 className='text-sm font-medium'>SSH Tunnel</h4>
              <SshConfigForm value={sshConfig} onChange={setSshConfig} />
            </div>

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

          <DialogFooter className='sm:justify-between mt-4'>
            <Button type='submit' variant='ghost'>
              Save
            </Button>
            <div className='flex gap-2'>
              <Button type='button' variant='outline' onClick={handleTest} disabled={testing || !isValid}>
                {testing ? 'Testing...' : 'Test'}
              </Button>
              <Button type='button' onClick={handleConnect} disabled={!isValid}>
                Connect
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <CreateGroupDialog isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
    </Dialog>
  )
}

function MysqlConnectionForm({ onClose, onCreated }: ConnectionFormProps) {
  const addConnection = useConnectionStore((s) => s.addConnection)
  const groups = useConnectionStore((s) => s.groups)
  const groupOrder = useConnectionStore((s) => s.groupOrder)

  const [sslConfig, setSslConfig] = useState<SslConfig>({ mode: 'disable' })
  const [sshConfig, setSshConfig] = useState<SshTunnelConfig | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<MysqlFormData>({
    resolver: zodResolver(mysqlSchema),
    defaultValues: {
      name: '',
      statusColor: 'default',
      tag: 'local',
      groupId: undefined,
      host: 'localhost',
      port: '3306',
      user: 'root',
      password: '',
      database: '',
    },
    mode: 'onChange',
  })

  const statusColor = watch('statusColor')
  const tag = watch('tag')
  const groupId = watch('groupId')

  const buildConnectionString = (data: MysqlFormData) => {
    const userPart = data.user ? `${data.user}${data.password ? `:${data.password}` : ''}@` : ''
    return `mysql://${userPart}${data.host}:${data.port}/${data.database}`
  }

  const handleTest = async () => {
    const data = getValues()
    setTesting(true)
    setTestResult(null)
    setTestError('')

    try {
      const connectionString = buildConnectionString(data)
      const options = { connectionString, sslConfig, sshConfig }
      await invoke('test_connection', { options })
      setTestResult('success')
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    } finally {
      setTesting(false)
    }
  }

  const saveConnection = (data: MysqlFormData) => {
    const connectionString = buildConnectionString(data)

    const conn = {
      id: crypto.randomUUID(),
      name: data.name || `${data.database || 'mysql'} @ ${data.host}`,
      path: connectionString,
      type: 'mysql' as const,
      host: data.host,
      port: data.port,
      database: data.database,
      sslConfig,
      sshConfig: sshConfig || undefined,
      tag: data.tag,
      statusColor: data.statusColor,
      groupId: data.groupId || undefined,
      createdAt: Date.now(),
    }

    addConnection(conn)
    onCreated()
  }

  const handleConnect = async () => {
    const data = getValues()
    try {
      const connectionString = buildConnectionString(data)
      const options = { connectionString, sslConfig, sshConfig }
      await invoke('test_connection', { options })
      saveConnection(data)
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>MySQL Connection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(saveConnection)}>
          <div className='space-y-4 max-h-[60vh] overflow-y-auto'>
            {/* Name */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Name</label>
              <Input {...register('name')} placeholder='Connection name' />
            </div>

            {/* Status Color & Tag */}
            <div className='flex gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Status color</label>
                <div className='flex gap-1.5'>
                  {STATUS_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type='button'
                      onClick={() => setValue('statusColor', c.value)}
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
                <Select value={tag} onValueChange={(value) => setValue('tag', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select tag' />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group Selection */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Group</label>
              <div className='flex gap-2'>
                <Select
                  value={groupId || '__none__'}
                  onValueChange={(value) => setValue('groupId', value === '__none__' ? undefined : value)}
                >
                  <SelectTrigger className='flex-1'>
                    <SelectValue placeholder='No group' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__none__'>No group</SelectItem>
                    {groupOrder.map((gId) => {
                      const group = groups[gId]
                      return (
                        <SelectItem key={gId} value={gId}>
                          {group?.name || 'Unnamed Group'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button type='button' variant='outline' size='icon' onClick={() => setShowCreateGroup(true)}>
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
            </div>

            {/* Host & Port */}
            <div className='flex gap-4'>
              <div className='flex-1 space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Host</label>
                <Input {...register('host')} placeholder='localhost' />
                {errors.host && <p className='text-xs text-destructive'>{errors.host.message}</p>}
              </div>
              <div className='w-24 space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Port</label>
                <Input {...register('port')} placeholder='3306' />
                {errors.port && <p className='text-xs text-destructive'>{errors.port.message}</p>}
              </div>
            </div>

            {/* User */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>User</label>
              <Input {...register('user')} placeholder='root' />
            </div>

            {/* Password */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Password</label>
              <Input type='password' {...register('password')} placeholder='password' />
            </div>

            {/* Database */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Database</label>
              <Input {...register('database')} placeholder='database name' />
              {errors.database && <p className='text-xs text-destructive'>{errors.database.message}</p>}
            </div>

            {/* SSH Tunnel Configuration */}
            <div className='space-y-3 pt-2 border-t border-border'>
              <h4 className='text-sm font-medium'>SSH Tunnel</h4>
              <SshConfigForm value={sshConfig} onChange={setSshConfig} />
            </div>

            {/* SSL Configuration */}
            <div className='space-y-3 pt-2 border-t border-border'>
              <h4 className='text-sm font-medium'>SSL/TLS</h4>
              <SslConfigForm config={sslConfig} onConfigChange={setSslConfig} isPostgres={true} />
            </div>

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

          <DialogFooter className='sm:justify-between mt-4'>
            <Button type='submit' variant='ghost'>
              Save
            </Button>
            <div className='flex gap-2'>
              <Button type='button' variant='outline' onClick={handleTest} disabled={testing || !isValid}>
                {testing ? 'Testing...' : 'Test'}
              </Button>
              <Button type='button' onClick={handleConnect} disabled={!isValid}>
                Connect
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <CreateGroupDialog isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
    </Dialog>
  )
}
function SqliteConnectionForm({ onClose, onCreated }: ConnectionFormProps) {
  const addConnection = useConnectionStore((s) => s.addConnection)
  const groups = useConnectionStore((s) => s.groups)
  const groupOrder = useConnectionStore((s) => s.groupOrder)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<SqliteFormData>({
    resolver: zodResolver(sqliteSchema),
    defaultValues: {
      name: '',
      statusColor: 'default',
      tag: 'local',
      groupId: undefined,
      filePath: '',
    },
    mode: 'onChange',
  })

  const statusColor = watch('statusColor')
  const tag = watch('tag')
  const groupId = watch('groupId')

  const buildConnectionString = (data: SqliteFormData) => {
    return data.filePath || ':memory:'
  }

  const handleTest = async () => {
    const data = getValues()
    setTesting(true)
    setTestResult(null)
    setTestError('')

    try {
      const connectionString = buildConnectionString(data)
      const options = { connectionString }
      await invoke('test_connection', { options })
      setTestResult('success')
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    } finally {
      setTesting(false)
    }
  }

  const saveConnection = (data: SqliteFormData) => {
    const connectionString = buildConnectionString(data)

    const conn = {
      id: crypto.randomUUID(),
      name: data.name || 'SQLite Database',
      path: connectionString,
      type: 'sqlite' as const,
      tag: data.tag,
      statusColor: data.statusColor,
      groupId: data.groupId || undefined,
      createdAt: Date.now(),
    }

    addConnection(conn)
    onCreated()
  }

  const handleConnect = async () => {
    const data = getValues()
    try {
      const connectionString = buildConnectionString(data)
      const options = { connectionString }
      await invoke('test_connection', { options })
      saveConnection(data)
    } catch (err) {
      setTestResult('error')
      setTestError(String(err))
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>SQLite Connection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(saveConnection)}>
          <div className='space-y-4 max-h-[60vh] overflow-y-auto'>
            {/* Name */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Name</label>
              <Input {...register('name')} placeholder='Connection name' />
            </div>

            {/* Status Color & Tag */}
            <div className='flex gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>Status color</label>
                <div className='flex gap-1.5'>
                  {STATUS_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type='button'
                      onClick={() => setValue('statusColor', c.value)}
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
                <Select value={tag} onValueChange={(value) => setValue('tag', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select tag' />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group Selection */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Group</label>
              <div className='flex gap-2'>
                <Select
                  value={groupId || '__none__'}
                  onValueChange={(value) => setValue('groupId', value === '__none__' ? undefined : value)}
                >
                  <SelectTrigger className='flex-1'>
                    <SelectValue placeholder='No group' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__none__'>No group</SelectItem>
                    {groupOrder.map((gId) => {
                      const group = groups[gId]
                      return (
                        <SelectItem key={gId} value={gId}>
                          {group?.name || 'Unnamed Group'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button type='button' variant='outline' size='icon' onClick={() => setShowCreateGroup(true)}>
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
            </div>

            {/* SQLite File Path */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>Database File</label>
              <Input {...register('filePath')} placeholder='/path/to/database.db or :memory:' />
              {errors.filePath && <p className='text-xs text-destructive'>{errors.filePath.message}</p>}
              <p className='text-xs text-muted-foreground'>Use :memory: for an in-memory database</p>
            </div>

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

          <DialogFooter className='sm:justify-between mt-4'>
            <Button type='submit' variant='ghost'>
              Save
            </Button>
            <div className='flex gap-2'>
              <Button type='button' variant='outline' onClick={handleTest} disabled={testing || !isValid}>
                {testing ? 'Testing...' : 'Test'}
              </Button>
              <Button type='button' onClick={handleConnect} disabled={!isValid}>
                Connect
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <CreateGroupDialog isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
    </Dialog>
  )
}
