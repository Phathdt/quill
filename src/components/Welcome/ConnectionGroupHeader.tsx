import { useState } from 'react'

import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { GROUP_COLORS_WITH_LABELS } from '@/lib/const'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import type { ConnectionGroup } from '@/types/connection'
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Palette, Pencil, Trash2 } from 'lucide-react'

interface ConnectionGroupHeaderProps {
  group: ConnectionGroup
  connectionCount: number
}

export function ConnectionGroupHeader({ group, connectionCount }: ConnectionGroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(group.name)

  const updateGroup = useConnectionStore((s) => s.updateGroup)
  const deleteGroup = useConnectionStore((s) => s.deleteGroup)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    data: { type: 'group', group },
  })

  // Make group header a drop target for connections
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-group-${group.id}`,
    data: { type: 'group-drop', groupId: group.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateGroup(group.id, { isExpanded: !group.isExpanded })
  }

  const handleRename = () => {
    if (editName.trim()) {
      updateGroup(group.id, { name: editName.trim() })
    }
    setIsEditing(false)
  }

  // Combine both refs
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    setDropRef(node)
  }

  return (
    <div
      ref={combinedRef}
      style={style}
      className={cn(
        'flex items-center gap-2 py-2 px-3 hover:bg-accent/50 group rounded-lg transition-colors',
        isOver && 'bg-primary/20 ring-2 ring-primary ring-inset'
      )}
    >
      <button {...listeners} {...attributes} className='cursor-grab active:cursor-grabbing p-0.5'>
        <GripVertical className='h-4 w-4 opacity-0 group-hover:opacity-100' />
      </button>

      <button
        onClick={handleToggle}
        onPointerDown={(e) => e.stopPropagation()}
        className='p-0.5 hover:bg-accent rounded'
      >
        {group.isExpanded ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
      </button>

      {group.color && <div className='w-2 h-2 rounded-full' style={{ backgroundColor: group.color }} />}

      {isEditing ? (
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          autoFocus
          className='h-6 text-sm'
        />
      ) : (
        <span className='flex-1 text-sm font-medium'>{group.name}</span>
      )}

      <span className='text-xs text-muted-foreground'>{connectionCount}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size='icon' variant='ghost' className='h-6 w-6 opacity-0 group-hover:opacity-100'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setIsEditing(true)}>
            <Pencil className='h-4 w-4 mr-2' />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className='h-4 w-4 mr-2' />
              Change Color
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {GROUP_COLORS_WITH_LABELS.map((color) => (
                <DropdownMenuItem key={color.value} onSelect={() => updateGroup(group.id, { color: color.value })}>
                  <div className='w-4 h-4 rounded-full mr-2' style={{ backgroundColor: color.value }} />
                  {color.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem className='text-destructive' onSelect={() => deleteGroup(group.id)}>
            <Trash2 className='h-4 w-4 mr-2' />
            Delete Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
