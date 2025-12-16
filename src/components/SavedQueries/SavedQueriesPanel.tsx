import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSavedQueriesStore } from '@/stores/savedQueriesStore'
import type { SavedQuery } from '@/types/saved-query'
import { Copy, Search, Star, Trash2 } from 'lucide-react'

interface SavedQueriesPanelProps {
  onSelectQuery: (sql: string) => void
  onClose: () => void
}

export function SavedQueriesPanel({ onSelectQuery, onClose }: SavedQueriesPanelProps) {
  const queriesMap = useSavedQueriesStore((s) => s.queries)
  const queryOrder = useSavedQueriesStore((s) => s.queryOrder)
  const tags = useSavedQueriesStore((s) => s.tags)
  const searchQuery = useSavedQueriesStore((s) => s.searchQuery)
  const selectedTags = useSavedQueriesStore((s) => s.selectedTags)
  const setSearchQuery = useSavedQueriesStore((s) => s.setSearchQuery)
  const setSelectedTags = useSavedQueriesStore((s) => s.setSelectedTags)
  const toggleFavorite = useSavedQueriesStore((s) => s.toggleFavorite)
  const deleteQuery = useSavedQueriesStore((s) => s.deleteQuery)
  const duplicateQuery = useSavedQueriesStore((s) => s.duplicateQuery)

  // Compute filtered queries with proper reactivity
  const queries = useMemo(() => {
    return queryOrder
      .map((id) => queriesMap[id])
      .filter((q): q is SavedQuery => {
        if (!q) return false

        // Search filter
        if (searchQuery) {
          const search = searchQuery.toLowerCase()
          const matchesName = q.name.toLowerCase().includes(search)
          const matchesSql = q.sql.toLowerCase().includes(search)
          const matchesDesc = q.description?.toLowerCase().includes(search)
          if (!matchesName && !matchesSql && !matchesDesc) return false
        }

        // Tag filter
        if (selectedTags.length > 0) {
          if (!selectedTags.some((tag) => q.tags.includes(tag))) return false
        }

        return true
      })
      .sort((a, b) => {
        // Favorites first, then by updatedAt
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [queriesMap, queryOrder, searchQuery, selectedTags])

  const handleLoadQuery = (sql: string) => {
    onSelectQuery(sql)
    onClose()
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  return (
    <div className='h-full flex flex-col'>
      {/* Search */}
      <div className='p-3 border-b border-border'>
        <div className='relative'>
          <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search queries...'
            className='pl-8'
          />
        </div>
      </div>

      {/* Tags filter */}
      {tags.length > 0 && (
        <div className='px-3 py-2 border-b border-border'>
          <div className='flex flex-wrap gap-1'>
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className='cursor-pointer'
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Query list */}
      <ScrollArea className='flex-1'>
        <div className='p-2 space-y-1'>
          {queries.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <p>No saved queries yet</p>
              <p className='text-xs mt-1'>Save queries from the editor</p>
            </div>
          ) : (
            queries.map((query) => (
              <div key={query.id} className='group p-2 rounded hover:bg-accent cursor-pointer'>
                <div
                  className='flex items-start justify-between'
                  onClick={() => handleLoadQuery(query.sql)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleLoadQuery(query.sql)
                    }
                  }}
                  role='button'
                  tabIndex={0}
                >
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-sm truncate'>{query.name}</span>
                      {query.isFavorite && <Star className='h-3 w-3 text-amber-400 fill-amber-400' />}
                    </div>
                    {query.description && (
                      <p className='text-xs text-muted-foreground truncate mt-0.5'>{query.description}</p>
                    )}
                    {query.tags.length > 0 && (
                      <div className='flex gap-1 mt-1'>
                        {query.tags.map((tag) => (
                          <Badge key={tag} variant='outline' className='text-[10px] px-1'>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <TooltipProvider>
                    <div className='flex gap-1 opacity-0 group-hover:opacity-100'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-6 w-6'
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(query.id)
                            }}
                          >
                            <Star className='h-3 w-3' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{query.isFavorite ? 'Unfavorite' : 'Favorite'}</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-6 w-6'
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateQuery(query.id)
                            }}
                          >
                            <Copy className='h-3 w-3' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Duplicate</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-6 w-6 text-destructive hover:text-destructive'
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteQuery(query.id)
                            }}
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
