import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { SshAuthType, SshTunnelConfig } from '@/types/ssh'

interface SshConfigFormProps {
  value: SshTunnelConfig | null
  onChange: (config: SshTunnelConfig | null) => void
  disabled?: boolean
}

export function SshConfigForm({ value, onChange, disabled }: SshConfigFormProps) {
  const [enabled, setEnabled] = useState(!!value)
  const [authType, setAuthType] = useState<SshAuthType>(value?.auth?.type ?? 'privateKey')

  const defaultConfig: SshTunnelConfig = {
    host: '',
    port: 22,
    username: '',
    auth: {
      type: 'privateKey',
      privateKeyPath: '',
    },
    remoteHost: 'localhost',
    remotePort: 5432,
    timeoutSeconds: 30,
  }

  const config = value ?? defaultConfig

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    if (checked) {
      onChange(defaultConfig)
    } else {
      onChange(null)
    }
  }

  const handleFieldChange = (field: string, fieldValue: string | number) => {
    if (!enabled) return

    const updated = { ...config, [field]: fieldValue }
    onChange(updated)
  }

  const handleAuthTypeChange = (newAuthType: SshAuthType) => {
    setAuthType(newAuthType)
    if (!enabled) return

    let auth
    if (newAuthType === 'password') {
      auth = { type: 'password' as const, password: '' }
    } else if (newAuthType === 'privateKey') {
      auth = { type: 'privateKey' as const, privateKeyPath: '' }
    } else {
      auth = { type: 'agent' as const }
    }

    onChange({ ...config, auth })
  }

  const handleAuthFieldChange = (field: string, fieldValue: string) => {
    if (!enabled) return

    const updated = {
      ...config,
      auth: { ...config.auth, [field]: fieldValue },
    }
    onChange(updated)
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center space-x-2'>
        <Switch id='ssh-enabled' checked={enabled} onCheckedChange={handleToggle} disabled={disabled} />
        <Label htmlFor='ssh-enabled'>Use SSH Tunnel</Label>
      </div>

      {enabled && (
        <>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='ssh-host'>SSH Host</Label>
              <Input
                id='ssh-host'
                value={config.host}
                onChange={(e) => handleFieldChange('host', e.target.value)}
                placeholder='ssh.example.com'
                disabled={disabled}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='ssh-port'>SSH Port</Label>
              <Input
                id='ssh-port'
                type='number'
                value={config.port}
                onChange={(e) => handleFieldChange('port', parseInt(e.target.value, 10))}
                placeholder='22'
                disabled={disabled}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='ssh-username'>Username</Label>
            <Input
              id='ssh-username'
              value={config.username}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              placeholder='root'
              disabled={disabled}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='auth-type'>Authentication Method</Label>
            <Select value={authType} onValueChange={handleAuthTypeChange} disabled={disabled}>
              <SelectTrigger id='auth-type'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='privateKey'>Private Key</SelectItem>
                <SelectItem value='password'>Password</SelectItem>
                <SelectItem value='agent'>SSH Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType === 'password' && config.auth.type === 'password' && (
            <div className='space-y-2'>
              <Label htmlFor='ssh-password'>Password</Label>
              <Input
                id='ssh-password'
                type='password'
                value={config.auth.password}
                onChange={(e) => handleAuthFieldChange('password', e.target.value)}
                placeholder='••••••••'
                disabled={disabled}
              />
            </div>
          )}

          {authType === 'privateKey' && config.auth.type === 'privateKey' && (
            <>
              <div className='space-y-2'>
                <Label htmlFor='ssh-key-path'>Private Key Path</Label>
                <Input
                  id='ssh-key-path'
                  value={config.auth.privateKeyPath}
                  onChange={(e) => handleAuthFieldChange('privateKeyPath', e.target.value)}
                  placeholder='~/.ssh/id_rsa'
                  disabled={disabled}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='ssh-passphrase'>Passphrase (optional)</Label>
                <Input
                  id='ssh-passphrase'
                  type='password'
                  value={config.auth.passphrase ?? ''}
                  onChange={(e) => handleAuthFieldChange('passphrase', e.target.value)}
                  placeholder='••••••••'
                  disabled={disabled}
                />
              </div>
            </>
          )}

          {authType === 'agent' && (
            <div className='text-sm text-muted-foreground'>Will use SSH agent for authentication</div>
          )}

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='remote-host'>Remote Database Host</Label>
              <Input
                id='remote-host'
                value={config.remoteHost}
                onChange={(e) => handleFieldChange('remoteHost', e.target.value)}
                placeholder='localhost'
                disabled={disabled}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='remote-port'>Remote Database Port</Label>
              <Input
                id='remote-port'
                type='number'
                value={config.remotePort}
                onChange={(e) => handleFieldChange('remotePort', parseInt(e.target.value, 10))}
                placeholder='5432'
                disabled={disabled}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
