import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSavedQueriesStore } from '@/stores/savedQueriesStore'
import { X } from 'lucide-react'

interface SaveQueryDialogProps {
  isOpen: boolean
  onClose: () => void
  sql: string
  connectionType?: 'postgres' | 'sqlite' | 'mysql'
}

export function SaveQueryDialog({ isOpen, onClose, sql, connectionType }: SaveQueryDialogProps) {
  const saveQuery = useSavedQueriesStore((s) => s.saveQuery)
  const existingTags = useSavedQueriesStore((s) => s.tags)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const handleSave = () => {
    if (!name.trim()) return

    saveQuery({
      name: name.trim(),
      sql,
      description: description.trim() || undefined,
      tags,
      connectionType: connectionType ?? 'any',
      isFavorite: false,
    })

    onClose()
    resetForm()
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setTags([])
    setTagInput('')
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Query</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='My useful query' autoFocus />
          </div>

          <div className='space-y-1'>
            <label className='text-sm font-medium'>Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What does this query do?'
            />
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Tags</label>
            <div className='flex flex-wrap gap-1 mb-2'>
              {tags.map((tag) => (
                <Badge key={tag} variant='secondary' className='pr-1'>
                  {tag}
                  <button onClick={() => removeTag(tag)} className='ml-1 hover:text-destructive'>
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              ))}
            </div>
            <div className='flex gap-2'>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder='Add tag...'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(tagInput)
                  }
                }}
              />
              <Button variant='outline' size='sm' onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>
                Add
              </Button>
            </div>

            {/* Existing tags suggestions */}
            {existingTags.length > 0 && (
              <div className='flex flex-wrap gap-1 mt-2'>
                {existingTags
                  .filter((t) => !tags.includes(t))
                  .slice(0, 10)
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant='outline'
                      className='cursor-pointer hover:bg-accent'
                      onClick={() => addTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className='space-y-1'>
            <label className='text-sm font-medium text-muted-foreground'>SQL Preview</label>
            <pre className='text-xs bg-muted p-2 rounded overflow-auto max-h-24 font-mono'>
              {sql.slice(0, 500)}
              {sql.length > 500 && '...'}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
