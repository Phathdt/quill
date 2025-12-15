import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConnectionStore } from '@/stores/connectionStore'
import type { Connection } from '@/types/connection'
import { Database, Plus, Search, X } from 'lucide-react'

import { ConnectionCard } from './ConnectionCard'
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
  const removeConnection = useConnectionStore((s) => s.removeConnection)

  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections
    const term = search.toLowerCase()
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.host?.toLowerCase().includes(term) ||
        c.database?.toLowerCase().includes(term)
    )
  }, [connections, search])

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
          <div className='w-32 h-32 mb-6 relative'>
            <div className='absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-3xl rotate-12 opacity-90' />
            <div className='absolute inset-2 bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 rounded-2xl rotate-6' />
            <div className='absolute inset-4 bg-gradient-to-br from-amber-200 via-orange-300 to-amber-400 rounded-xl flex items-center justify-center'>
              <span className='text-4xl'>🪶</span>
            </div>
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

        {/* Search Bar */}
        <div className='p-4 border-b border-border'>
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
          {filteredConnections.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
              <Database className='w-16 h-16 mb-4 opacity-50' strokeWidth={1} />
              <p className='text-lg font-medium'>No connections yet</p>
              <p className='text-sm mt-1'>Create your first connection to get started</p>
              <Button onClick={handleCreateConnection} className='mt-4'>
                Create connection
              </Button>
            </div>
          ) : (
            <div className='space-y-2'>
              {filteredConnections.map((conn) => (
                <ConnectionCard
                  key={conn.id}
                  connection={conn}
                  onConnect={() => onConnect(conn)}
                  onDelete={() => removeConnection(conn.id)}
                />
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
