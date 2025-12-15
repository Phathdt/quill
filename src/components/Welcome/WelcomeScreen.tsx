import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConnectionStore } from '@/stores/connectionStore'
import type { Connection } from '@/types/connection'
import { Database, Plus, Search, X } from 'lucide-react'

import { ConnectionCard } from './ConnectionCard'
import { ConnectionGroupHeader } from './ConnectionGroupHeader'
import { DatabaseTypeModal } from './DatabaseTypeModal'
import { NewConnectionModal } from './NewConnectionModal'

interface WelcomeScreenProps {
  onConnect: (connection: Connection) => void
  error?: string | null
}

export function WelcomeScreen({ onConnect, error }: WelcomeScreenProps) {
  const [search, setSearch] = useState('')
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedDbType, setSelectedDbType] = useState<'postgres' | 'sqlite'>('postgres')

  const connections = useConnectionStore((s) => s.connections)
  const groups = useConnectionStore((s) => s.groups)
  const getGroupedConnections = useConnectionStore((s) => s.getGroupedConnections)
  const moveToGroup = useConnectionStore((s) => s.moveToGroup)
  const removeConnection = useConnectionStore((s) => s.removeConnection)

  const filteredGroupedConnections = useMemo(() => {
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
  }, [getGroupedConnections, search])

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

  return (
    <div className='flex h-screen bg-background'>
      {/* Left Sidebar - Branding */}
      <aside className='w-72 bg-card border-r border-border flex flex-col'>
        {/* Logo Area */}
        <div className='flex-1 flex flex-col items-center justify-center p-8'>
          <div className='w-32 h-32 mb-6'>
            <img src='/icon.png' alt='Quill' className='w-full h-full object-contain' />
          </div>
          <h1 className='text-3xl font-bold text-foreground tracking-tight'>Quill</h1>
          <p className='text-muted-foreground text-sm mt-1'>Write data, beautifully</p>
          <p className='text-muted-foreground/50 text-xs mt-4'>Version 0.1.0</p>
        </div>

        {/* Bottom Actions */}
        <div className='p-4 space-y-2'>
          <Button onClick={handleCreateConnection} variant='secondary' className='w-full justify-start gap-3'>
            <div className='w-8 h-8 rounded-full bg-muted flex items-center justify-center'>
              <Plus className='w-4 h-4' />
            </div>
            <span className='text-sm font-medium'>Create connection...</span>
          </Button>
        </div>
      </aside>

      {/* Main Content - Connection List */}
      <main className='flex-1 flex flex-col bg-background'>
        {/* Error Message */}
        {error && (
          <div className='mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm'>
            {error}
          </div>
        )}

        {/* Header Bar */}
        <div className='p-4 border-b border-border space-y-3'>
          {/* Search Bar */}
          <div className='relative'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
            <Input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search connections...'
              className='pl-12 pr-10'
            />
            {search && (
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setSearch('')}
                className='absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6'
              >
                <X className='h-4 w-4' />
                <span className='sr-only'>Clear search</span>
              </Button>
            )}
          </div>
        </div>

        {/* Connection List */}
        <div className='flex-1 overflow-auto p-4'>
          {!hasContent ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
              <Database className='w-16 h-16 mb-4 opacity-50' strokeWidth={1} />
              <p className='text-lg font-medium'>No connections yet</p>
              <p className='text-sm mt-1'>Create your first connection to get started</p>
              <Button onClick={handleCreateConnection} className='mt-4'>
                Create connection
              </Button>
            </div>
          ) : filteredGroupedConnections.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
              <Database className='w-16 h-16 mb-4 opacity-50' strokeWidth={1} />
              <p className='text-lg font-medium'>No matching connections</p>
              <p className='text-sm mt-1'>Try a different search term</p>
            </div>
          ) : (
            <div className='space-y-1'>
              {filteredGroupedConnections.map(({ group, connections }) => (
                <div key={group?.id ?? 'ungrouped'}>
                  {group && <ConnectionGroupHeader group={group} connectionCount={connections.length} />}

                  {(!group || group.isExpanded) && (
                    <div className={group ? 'ml-4' : ''}>
                      {connections.map((conn) => (
                        <ConnectionCard
                          key={conn.id}
                          connection={conn}
                          onConnect={() => onConnect(conn)}
                          onDelete={() => removeConnection(conn.id)}
                          onMoveToGroup={(groupId) => moveToGroup(conn.id, groupId)}
                          availableGroups={Object.values(groups)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showTypeModal && <DatabaseTypeModal onSelect={handleSelectType} onClose={() => setShowTypeModal(false)} />}

      {showNewModal && (
        <NewConnectionModal
          dbType={selectedDbType}
          onClose={() => setShowNewModal(false)}
          onCreated={() => setShowNewModal(false)}
        />
      )}
    </div>
  )
}
