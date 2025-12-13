import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { executeQuery } from '@/lib/tauri'
import { cn } from '@/lib/utils'
import { ChevronRight, RefreshCw, Search, Table } from 'lucide-react'

interface TableInfo {
  name: string
  type: 'table' | 'view'
}

export function Sidebar() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    setLoading(true)
    try {
      // Try PostgreSQL query first
      const result = await executeQuery(`
        SELECT table_name as name, 'table' as type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `)

      if (result.rows.length > 0) {
        setTables(
          result.rows.map((row) => ({
            name: String(row[0]),
            type: (String(row[1]) as 'table' | 'view') || 'table',
          }))
        )
      }
    } catch {
      // Fallback to SQLite
      try {
        const result = await executeQuery(`
          SELECT name, type FROM sqlite_master
          WHERE type IN ('table', 'view')
          AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `)
        setTables(
          result.rows.map((row) => ({
            name: String(row[0]),
            type: (String(row[1]) as 'table' | 'view') || 'table',
          }))
        )
      } catch {
        setTables([])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className='w-56 border-r border-border bg-card flex flex-col'>
      {/* Search */}
      <div className='p-2 border-b border-border'>
        <div className='relative'>
          <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input type='text' placeholder='Search for item...' className='h-8 pl-8 pr-2 text-sm' />
        </div>
      </div>

      {/* Tables list */}
      <ScrollArea className='flex-1'>
        <div className='p-2'>
          {/* Tables section */}
          <div className='mb-2'>
            <button
              onClick={() => setExpanded(!expanded)}
              className='flex items-center gap-1 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors'
            >
              <ChevronRight className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-90' : '')} />
              <span className='font-medium'>Tables</span>
              <span className='ml-auto text-xs text-muted-foreground'>{tables.length}</span>
            </button>

            {expanded && (
              <div className='ml-4 mt-1 space-y-0.5'>
                {loading ? (
                  <div className='text-sm text-muted-foreground py-1'>Loading...</div>
                ) : tables.length === 0 ? (
                  <div className='text-sm text-muted-foreground py-1'>No tables</div>
                ) : (
                  tables.map((table) => (
                    <Button
                      key={table.name}
                      variant='ghost'
                      className='w-full justify-start gap-2 h-auto py-1 px-2 text-sm font-normal'
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
      </ScrollArea>

      {/* Bottom bar */}
      <div className='p-2 border-t border-border flex items-center gap-2'>
        <Button variant='ghost' size='icon' onClick={loadTables} className='h-7 w-7'>
          <RefreshCw className='h-4 w-4' />
          <span className='sr-only'>Refresh</span>
        </Button>
        <select className='flex-1 px-2 py-1 bg-background border border-input rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring'>
          <option>public</option>
        </select>
      </div>
    </aside>
  )
}
