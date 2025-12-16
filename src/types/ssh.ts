export type SshAuthType = 'password' | 'privateKey' | 'agent'

export interface SshAuthPassword {
  type: 'password'
  password: string
}

export interface SshAuthPrivateKey {
  type: 'privateKey'
  privateKeyPath: string
  passphrase?: string
}

export interface SshAuthAgent {
  type: 'agent'
}

export type SshAuthMethod = SshAuthPassword | SshAuthPrivateKey | SshAuthAgent

export interface SshTunnelConfig {
  host: string
  port: number
  username: string
  auth: SshAuthMethod
  remoteHost: string
  remotePort: number
  localPort?: number
  timeoutSeconds?: number
}

export interface TunnelStatus {
  localPort: number
  state: 'Connecting' | 'Connected' | 'Disconnected' | 'Error'
}
