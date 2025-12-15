export type SslMode = 'disable' | 'prefer' | 'require' | 'verify-ca' | 'verify-full'

export interface SslConfig {
  mode: SslMode
  rootCertPath?: string // CA certificate
  clientCertPath?: string // Client certificate
  clientKeyPath?: string // Client private key
}

export interface ConnectionGroup {
  id: string
  name: string
  color?: string
  isExpanded: boolean
  order: number
}

export interface Connection {
  id: string
  name: string
  path: string // Full connection string
  type: 'sqlite' | 'postgres'
  // PostgreSQL specific
  host?: string
  port?: string
  database?: string
  // SSL configuration
  sslConfig?: SslConfig
  // Metadata
  tag?: string
  statusColor?: string
  createdAt: number
  lastUsedAt?: number // Track last connection time
  // Group organization
  groupId?: string
}

export interface ConnectionState {
  connections: Connection[]
  activeConnectionId: string | null
}

export interface ConnectionsState {
  connections: Record<string, Connection>
  connectionOrder: string[]
  groups: Record<string, ConnectionGroup>
  groupOrder: string[]
}
