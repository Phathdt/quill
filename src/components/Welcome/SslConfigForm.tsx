import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SslConfig, SslMode } from '@/types/connection'
import { FileKey2 } from 'lucide-react'

interface SslConfigFormProps {
  config: SslConfig
  onConfigChange: (config: SslConfig) => void
  isPostgres: boolean
}

const SSL_MODE_OPTIONS: { value: SslMode; label: string }[] = [
  { value: 'disable', label: 'Disable' },
  { value: 'prefer', label: 'Prefer (try SSL, fallback if unavailable)' },
  { value: 'require', label: 'Require (must use SSL)' },
  { value: 'verify-ca', label: 'Verify CA (validate server cert)' },
  { value: 'verify-full', label: 'Verify Full (validate cert + hostname)' },
]

export function SslConfigForm({ config, onConfigChange, isPostgres }: SslConfigFormProps) {
  if (!isPostgres) {
    return <p className='text-xs text-muted-foreground'>SSL is not applicable for SQLite connections.</p>
  }

  const showCertFields = config.mode === 'verify-ca' || config.mode === 'verify-full'

  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <label className='text-xs text-muted-foreground'>SSL Mode</label>
        <Select value={config.mode} onValueChange={(value) => onConfigChange({ ...config, mode: value as SslMode })}>
          <SelectTrigger>
            <SelectValue placeholder='Select SSL mode' />
          </SelectTrigger>
          <SelectContent>
            {SSL_MODE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCertFields && (
        <>
          <div className='space-y-1'>
            <label className='text-xs text-muted-foreground'>Root Certificate (CA)</label>
            <div className='flex gap-2'>
              <Input
                placeholder='/path/to/ca-certificate.crt'
                value={config.rootCertPath ?? ''}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    rootCertPath: e.target.value || undefined,
                  })
                }
              />
              <Button variant='outline' size='icon' title='Browse'>
                <FileKey2 className='h-4 w-4' />
              </Button>
            </div>
          </div>

          <div className='space-y-1'>
            <label className='text-xs text-muted-foreground'>Client Certificate (optional)</label>
            <div className='flex gap-2'>
              <Input
                placeholder='/path/to/client-cert.crt'
                value={config.clientCertPath ?? ''}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    clientCertPath: e.target.value || undefined,
                  })
                }
              />
              <Button variant='outline' size='icon' title='Browse'>
                <FileKey2 className='h-4 w-4' />
              </Button>
            </div>
          </div>

          <div className='space-y-1'>
            <label className='text-xs text-muted-foreground'>Client Key (optional)</label>
            <div className='flex gap-2'>
              <Input
                placeholder='/path/to/client-key.key'
                value={config.clientKeyPath ?? ''}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    clientKeyPath: e.target.value || undefined,
                  })
                }
              />
              <Button variant='outline' size='icon' title='Browse'>
                <FileKey2 className='h-4 w-4' />
              </Button>
            </div>
          </div>

          <p className='text-xs text-muted-foreground'>
            Client certificate and key are required for mutual TLS authentication.
          </p>
        </>
      )}
    </div>
  )
}
