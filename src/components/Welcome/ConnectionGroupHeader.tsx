import { useState } from 'react'

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
import { useConnectionStore } from '@/stores/connectionStore'
import type { ConnectionGroup } from '@/types/connection'
import { ChevronDown, ChevronRight, MoreHorizontal, Palette, Pencil, Trash2 } from 'lucide-react'

const GROUP_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
]

interface ConnectionGroupHeaderProps {
  group: ConnectionGroup
  connectionCount: number
}

export function ConnectionGroupHeader({ group, connectionCount }: ConnectionGroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(group.name)

  const updateGroup = useConnectionStore((s) => s.updateGroup)
  const deleteGroup = useConnectionStore((s) => s.deleteGroup)

  const handleToggle = () => {
    updateGroup(group.id, { isExpanded: !group.isExpanded })
  }

  const handleRename = () => {
    if (editName.trim()) {
      updateGroup(group.id, { name: editName.trim() })
    }
    setIsEditing(false)
  }

  return (
    <div className='flex items-center gap-2 py-2 px-3 hover:bg-accent/50 group'>
      <button onClick={handleToggle} className='p-0.5'>
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
              {GROUP_COLORS.map((color) => (
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
