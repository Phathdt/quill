import {
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWelcomeFilter } from '@/hooks'
import { useConnectionStore } from '@/stores/connectionStore'
import type { Connection } from '@/types/connection'
import { Database, Search, X } from 'lucide-react'

import { AdaptiveSidebar } from './AdaptiveSidebar'
import { ConnectionCard } from './ConnectionCard'
import { ConnectionGroupHeader } from './ConnectionGroupHeader'
import { DatabaseTypeModal } from './DatabaseTypeModal'
import { NewConnectionModal } from './NewConnectionModal'

// Custom collision detection that prioritizes drop zones
const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)

  // Prioritize group-drop zones over group sortables
  const dropZoneCollisions = pointerCollisions.filter(
    (collision) => collision.data?.droppableContainer?.data?.current?.type === 'group-drop'
  )

  if (dropZoneCollisions.length > 0) {
    return dropZoneCollisions
  }

  // Fall back to rect intersection for better detection
  if (pointerCollisions.length === 0) {
    return rectIntersection(args)
  }

  return pointerCollisions
}

interface WelcomeScreenProps {
  onConnect: (connection: Connection) => void
  error?: string | null
}

export function WelcomeScreen({ onConnect, error }: WelcomeScreenProps) {
  const groups = useConnectionStore((s) => s.groups)
  const groupOrder = useConnectionStore((s) => s.groupOrder)
  const moveToGroup = useConnectionStore((s) => s.moveToGroup)
  const removeConnection = useConnectionStore((s) => s.removeConnection)
  const reorderGroups = useConnectionStore((s) => s.reorderGroups)

  // Filter logic extracted to hook
  const {
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
  } = useWelcomeFilter()

  // Drag-and-drop state and handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    // Handle connection dropped on group drop zone
    if (activeType === 'connection' && overType === 'group-drop') {
      const connectionId = (active.id as string).replace('connection-', '')
      const targetGroupId = over.data.current?.groupId as string | null
      moveToGroup(connectionId, targetGroupId)
      return
    }

    // Handle connection dropped on group header (sortable)
    if (activeType === 'connection' && overType === 'group') {
      const connectionId = (active.id as string).replace('connection-', '')
      const targetGroupId = over.data.current?.group?.id as string
      if (targetGroupId) {
        moveToGroup(connectionId, targetGroupId)
      }
      return
    }

    // Handle group reordering
    if (activeType === 'group' && overType === 'group') {
      const oldIndex = groupOrder.indexOf(active.id as string)
      const newIndex = groupOrder.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderGroups(oldIndex, newIndex)
      }
    }
  }

  return (
    <div className='flex h-screen bg-background'>
      {/* Left Sidebar - Adaptive Sidebar */}
      <AdaptiveSidebar onConnect={onConnect} onCreateConnection={handleCreateConnection} />

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
            <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragEnd={handleDragEnd}>
              <div className='space-y-1'>
                {/* Ungrouped connections - no header, just cards */}
                {filteredGroupedConnections
                  .find(({ group }) => group === null)
                  ?.connections.map((conn) => (
                    <ConnectionCard
                      key={conn.id}
                      connection={conn}
                      onConnect={() => onConnect(conn)}
                      onDelete={() => removeConnection(conn.id)}
                      onMoveToGroup={(groupId) => moveToGroup(conn.id, groupId)}
                      availableGroups={Object.values(groups)}
                    />
                  ))}

                {/* Groups section */}
                <SortableContext items={groupOrder} strategy={verticalListSortingStrategy}>
                  {filteredGroupedConnections
                    .filter(({ group }) => group !== null)
                    .map(({ group, connections }) => (
                      <div key={group!.id}>
                        <ConnectionGroupHeader group={group!} connectionCount={connections.length} />

                        {group!.isExpanded && (
                          <div className='ml-4'>
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
                </SortableContext>
              </div>
            </DndContext>
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
