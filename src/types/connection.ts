export interface Connection {
  id: string
  name: string
  path: string // Full connection string
  type: 'sqlite' | 'postgres'
  // PostgreSQL specific
  host?: string
  port?: string
  database?: string
  // Metadata
  tag?: string
  statusColor?: string
  createdAt: number
}

export interface ConnectionState {
  connections: Connection[]
  activeConnectionId: string | null
}
