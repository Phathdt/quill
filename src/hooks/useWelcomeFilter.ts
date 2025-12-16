import { useMemo, useState } from 'react'

import { useConnectionStore } from '@/stores/connectionStore'

/**
 * Hook to manage filtering and search in the Welcome screen
 * Handles connection search and grouped connections filtering
 */
export function useWelcomeFilter() {
  const [search, setSearch] = useState('')
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedDbType, setSelectedDbType] = useState<'postgres' | 'sqlite'>('postgres')

  const connections = useConnectionStore((s) => s.connections)
  const groups = useConnectionStore((s) => s.groups)
  const getGroupedConnections = useConnectionStore((s) => s.getGroupedConnections)

  // Filter grouped connections by search term
  // Note: groups/connections in deps trigger re-render when store state changes
  const filteredGroupedConnections = useMemo(() => {
    // Reference groups and connections to satisfy eslint (they trigger reactivity)
    void groups
    void connections

    const groupedConns = getGroupedConnections()

    if (!search.trim()) return groupedConns

    const term = search.toLowerCase()
    return (
      groupedConns
        .map(({ group, connections: conns }) => ({
          group,
          connections: conns.filter(
            (c) =>
              c.name.toLowerCase().includes(term) ||
              c.host?.toLowerCase().includes(term) ||
              c.database?.toLowerCase().includes(term)
          ),
        }))
        // Keep groups even if they have no matching connections (for empty group display)
        .filter(({ group, connections: conns }) => conns.length > 0 || group !== null)
    )
  }, [getGroupedConnections, search, groups, connections])

  // Check if we have any content to show (connections or groups)
  const hasContent = connections.length > 0 || Object.keys(groups).length > 0

  const handleSelectType = (type: 'postgres' | 'sqlite') => {
    setSelectedDbType(type)
    setShowTypeModal(false)
    setShowNewModal(true)
  }

  const handleCreateConnection = () => {
    setShowTypeModal(true)
  }

  return {
    search,
    setSearch,
    filteredGroupedConnections,
    hasContent,
    showTypeModal,
    setShowTypeModal,
    showNewModal,
    setShowNewModal,
    selectedDbType,
    handleSelectType,
    handleCreateConnection,
  }
}
