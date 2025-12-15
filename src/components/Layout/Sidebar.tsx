import { useMemo, useState } from 'react'

import { SavedQueriesPanel } from '@/components/SavedQueries/SavedQueriesPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useHistoryList, useTableList } from '@/hooks'
import { cn } from '@/lib/utils'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import {
  AlertCircle,
  Bookmark,
  ChevronRight,
  Clock,
  Database,
  History,
  RefreshCw,
  Search,
  Table,
  Trash2,
} from 'lucide-react'

type SidebarTab = 'items' | 'history' | 'queries'

export function Sidebar() {
  const activeWorkspace = useWorkspaceManagerStore((s) => s.getActiveWorkspace())
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const setTabSql = useWorkspaceManagerStore((s) => s.setTabSql)

  const [expanded, setExpanded] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('items')
  const [searchQuery, setSearchQuery] = useState('')

  const isConnected = activeWorkspace?.isConnected ?? false
  const workspaceId = activeWorkspace?.id

  // Tables logic extracted to hook
  const { tables, loading, loadTables, openTable } = useTableList(workspaceId, isConnected)

  // History logic extracted to hook
  const { history, loadHistoryEntry, removeEntry, formatRelativeTime } = useHistoryList(workspaceId, searchQuery)

  // Filter tables by search
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables
    return tables.filter((table) => table.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [tables, searchQuery])

  // Handle saved query selection
  const handleSelectSavedQuery = (sql: string) => {
    if (activeWorkspace && activeTab) {
      setTabSql(activeWorkspace.id, activeTab.id, sql)
    }
  }

  return (
    <aside className='w-56 border-r border-border bg-card flex flex-col'>
      {/* Tab switcher */}
      <div className='flex border-b border-border'>
        <button
          onClick={() => setSidebarTab('items')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
            sidebarTab === 'items'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Database className='h-3.5 w-3.5' />
          Items
        </button>
        <button
          onClick={() => setSidebarTab('history')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
            sidebarTab === 'history'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <History className='h-3.5 w-3.5' />
          History
        </button>
        <button
          onClick={() => setSidebarTab('queries')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
            sidebarTab === 'queries'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Bookmark className='h-3.5 w-3.5' />
          Saved
        </button>
      </div>

      {/* Search - hide for saved queries tab (has own search) */}
      {sidebarTab !== 'queries' && (
        <div className='p-2 border-b border-border'>
          <div className='relative'>
            <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              type='text'
              placeholder={sidebarTab === 'items' ? 'Search tables...' : 'Search history...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-8 pl-8 pr-2 text-sm'
            />
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      <ScrollArea className='flex-1'>
        {sidebarTab === 'queries' ? (
          <SavedQueriesPanel onSelectQuery={handleSelectSavedQuery} onClose={() => {}} />
        ) : sidebarTab === 'items' ? (
          <div className='p-2'>
            {/* Tables section */}
            <div className='mb-2'>
              <button
                onClick={() => setExpanded(!expanded)}
                className='flex items-center gap-1 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors'
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-90' : '')} />
                <span className='font-medium'>Tables</span>
                <span className='ml-auto text-xs text-muted-foreground'>{filteredTables.length}</span>
              </button>

              {expanded && (
                <div className='ml-4 mt-1 space-y-0.5'>
                  {!isConnected ? (
                    <div className='text-sm text-muted-foreground py-1'>Not connected</div>
                  ) : loading ? (
                    <div className='text-sm text-muted-foreground py-1'>Loading...</div>
                  ) : filteredTables.length === 0 ? (
                    <div className='text-sm text-muted-foreground py-1'>{searchQuery ? 'No matches' : 'No tables'}</div>
                  ) : (
                    filteredTables.map((table) => (
                      <Button
                        key={table.name}
                        variant='ghost'
                        className='w-full justify-start gap-2 h-auto py-1 px-2 text-sm font-normal'
                        onClick={() => openTable(table.name)}
                      >
                        <Table className='h-4 w-4 text-muted-foreground' />
                        <span className='truncate'>{table.name}</span>
                      </Button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className='flex flex-col'>
            {history.length === 0 ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                {searchQuery ? 'No matching queries' : 'No query history yet'}
              </div>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className='group relative px-3 py-2 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors'
                  onClick={() => loadHistoryEntry(entry.sql)}
                >
                  {/* SQL preview */}
                  <p className='text-xs font-mono text-foreground truncate pr-6' title={entry.sql}>
                    {entry.sql.slice(0, 60)}
                    {entry.sql.length > 60 ? '...' : ''}
                  </p>

                  {/* Metadata */}
                  <div className='flex items-center gap-2 mt-1 text-xs text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <Clock className='h-3 w-3' />
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                    {entry.executionTimeMs && <span>{entry.executionTimeMs}ms</span>}
                    {entry.rowCount !== undefined && !entry.error && <span>{entry.rowCount} rows</span>}
                    {entry.error && (
                      <span className='flex items-center gap-1 text-destructive'>
                        <AlertCircle className='h-3 w-3' />
                        Error
                      </span>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    className='absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all'
                    onClick={(e) => {
                      e.stopPropagation()
                      removeEntry(entry.id)
                    }}
                  >
                    <Trash2 className='h-3 w-3' />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>

      {/* Bottom bar - only show for Items tab */}
      {sidebarTab === 'items' && (
        <div className='p-2 border-t border-border flex items-center gap-2'>
          <Button variant='ghost' size='icon' onClick={loadTables} className='h-7 w-7' disabled={!isConnected}>
            <RefreshCw className='h-4 w-4' />
          </Button>
          <Select value={activeWorkspace?.schema || 'public'} disabled>
            <SelectTrigger className='flex-1 h-7 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={activeWorkspace?.schema || 'public'}>{activeWorkspace?.schema || 'public'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </aside>
  )
}
