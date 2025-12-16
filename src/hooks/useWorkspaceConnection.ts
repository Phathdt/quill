import { useCallback, useEffect, useRef, useState } from 'react'

import { invoke } from '@tauri-apps/api/tauri'

import { disconnectWorkspace } from '@/lib/tauri'
import { toast } from '@/lib/toast'
import { getErrorMessage } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import { useWorkspaceManagerStore } from '@/stores/workspace'
import type { Connection } from '@/types/connection'

/**
 * Hook to manage workspace connections
 * Handles creating workspaces, connecting to databases, and disconnecting
 */
export function useWorkspaceConnection() {
  const [connectError, setConnectError] = useState<string | null>(null)
  const createWorkspace = useWorkspaceManagerStore((s) => s.createWorkspace)
  const closeWorkspace = useWorkspaceManagerStore((s) => s.closeWorkspace)
  const setWorkspaceConnected = useWorkspaceManagerStore((s) => s.setWorkspaceConnected)
  const workspaceCount = useWorkspaceManagerStore((s) => s.workspaceOrder.length)
  const updateLastUsedAt = useConnectionStore((s) => s.updateLastUsedAt)

  /**
   * Connect to a database and create a new workspace
   */
  const connect = useCallback(
    async (connection: Connection): Promise<boolean> => {
      setConnectError(null)

      // Create new workspace
      const workspaceId = createWorkspace(connection)
      if (!workspaceId) {
        const errorMsg = `Maximum 5 workspaces allowed (currently ${workspaceCount} open). Close some workspaces first.`
        setConnectError(errorMsg)
        toast.error(errorMsg)
        return false
      }

      try {
        await invoke('connect_workspace', {
          workspaceId,
          options: {
            connectionString: connection.path,
            sslConfig: connection.sslConfig,
          },
        })
        setWorkspaceConnected(workspaceId, true)
        updateLastUsedAt(connection.id)
        setConnectError(null)
        return true
      } catch (err) {
        // Clean up the workspace if connection failed
        closeWorkspace(workspaceId)
        const errorMsg = getErrorMessage(err)
        setConnectError(errorMsg)
        toast.error(`Connection failed: ${errorMsg}`)
        return false
      }
    },
    [createWorkspace, setWorkspaceConnected, closeWorkspace, updateLastUsedAt, workspaceCount]
  )

  /**
   * Disconnect and close a workspace
   */
  const disconnect = useCallback(
    async (workspaceId: string) => {
      try {
        await disconnectWorkspace(workspaceId)
      } catch {
        // Ignore disconnect errors
      }
      closeWorkspace(workspaceId)
    },
    [closeWorkspace]
  )

  return {
    connectError,
    connect,
    disconnect,
    clearError: () => setConnectError(null),
  }
}

/**
 * Hook to handle connection from URL parameters (Command Palette navigation)
 * Automatically connects when connectionId is present in route
 */
export function useConnectionFromRoute(
  connectionId: string | undefined,
  onNavigate: (path: string, replace?: boolean) => void
) {
  const connections = useConnectionStore((s) => s.connections)
  const updateLastUsedAt = useConnectionStore((s) => s.updateLastUsedAt)
  const createWorkspace = useWorkspaceManagerStore((s) => s.createWorkspace)
  const setWorkspaceConnected = useWorkspaceManagerStore((s) => s.setWorkspaceConnected)
  const closeWorkspace = useWorkspaceManagerStore((s) => s.closeWorkspace)
  const workspaceCount = useWorkspaceManagerStore((s) => s.workspaceOrder.length)

  const [error, setError] = useState<string | null>(null)
  const processedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!connectionId || processedRef.current === connectionId) return

    const connection = connections.find((c) => c.id === connectionId)
    if (!connection) {
      // Schedule error update and navigation for next tick to avoid setState in effect
      Promise.resolve().then(() => {
        setError('Connection not found')
        toast.error('Connection not found')
        onNavigate('/workspaces', true)
      })
      return
    }

    // Mark as processed
    processedRef.current = connectionId

    // Check if workspace already exists for this connection
    const workspaces = useWorkspaceManagerStore.getState().workspaces
    const existingWorkspace = Object.values(workspaces).find((ws) => ws.connectionId === connectionId)

    if (existingWorkspace) {
      // Switch to existing workspace
      useWorkspaceManagerStore.getState().switchWorkspace(existingWorkspace.id)
      updateLastUsedAt(connection.id)
      onNavigate('/workspaces', true)
      return
    }

    // Connect to the database
    const doConnect = async () => {
      const workspaceId = createWorkspace(connection)
      if (!workspaceId) {
        const errorMsg = `Maximum 5 workspaces allowed (currently ${workspaceCount} open)`
        setError(errorMsg)
        toast.error(errorMsg)
        onNavigate('/workspaces', true)
        return
      }

      try {
        await invoke('connect_workspace', {
          workspaceId,
          options: {
            connectionString: connection.path,
            sslConfig: connection.sslConfig,
          },
        })
        setWorkspaceConnected(workspaceId, true)
        updateLastUsedAt(connection.id)
        setError(null)
      } catch (err) {
        closeWorkspace(workspaceId)
        const errorMsg = getErrorMessage(err)
        setError(errorMsg)
        toast.error(`Connection failed: ${errorMsg}`)
      }
      onNavigate('/workspaces', true)
    }

    doConnect()
  }, [
    connectionId,
    connections,
    createWorkspace,
    setWorkspaceConnected,
    closeWorkspace,
    updateLastUsedAt,
    workspaceCount,
    onNavigate,
  ])

  return { error }
}
