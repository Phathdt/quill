import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface DatabaseTypeModalProps {
  onSelect: (type: 'postgres' | 'sqlite') => void
  onClose: () => void
}

const DB_TYPES = [
  { id: 'postgres', label: 'PostgreSQL', abbr: 'Pg', color: 'bg-sky-500' },
  { id: 'sqlite', label: 'SQLite', abbr: 'Sl', color: 'bg-violet-500' },
] as const

export function DatabaseTypeModal({ onSelect, onClose }: DatabaseTypeModalProps) {
  const [selected, setSelected] = useState<'postgres' | 'sqlite'>('postgres')
  const [search, setSearch] = useState('')

  const filteredTypes = DB_TYPES.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Select Database Type</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search database types...'
            autoFocus
            className='pl-9'
          />
        </div>

        {/* Database Types Grid */}
        <div className='grid grid-cols-4 gap-3 py-4'>
          {filteredTypes.map((db) => (
            <button
              key={db.id}
              onClick={() => setSelected(db.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl transition-all',
                selected === db.id ? 'bg-accent ring-2 ring-primary' : 'hover:bg-accent'
              )}
            >
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg',
                  db.color
                )}
              >
                {db.abbr}
              </div>
              <span className='text-sm text-foreground'>{db.label}</span>
            </button>
          ))}

          {/* Coming Soon Placeholders */}
          {['MySQL', 'DuckDB'].map((name) => (
            <div key={name} className='flex flex-col items-center gap-2 p-4 opacity-40 cursor-not-allowed'>
              <div className='w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg'>
                ?
              </div>
              <span className='text-sm text-muted-foreground'>{name}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSelect(selected)}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
