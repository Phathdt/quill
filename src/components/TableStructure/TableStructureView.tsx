import { useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTableStructure } from '@/lib/tauri'
import { cn } from '@/lib/utils'
import type { TableStructure } from '@/types/schema'
import { AlertCircle, Columns3, Key, Link, Loader2 } from 'lucide-react'

import { ColumnsTable } from './ColumnsTable'
import { ForeignKeysTable } from './ForeignKeysTable'
import { IndexesTable } from './IndexesTable'

interface TableStructureViewProps {
  workspaceId: string
  tableName: string
}

type TabType = 'columns' | 'indexes' | 'foreign-keys'

export function TableStructureView({ workspaceId, tableName }: TableStructureViewProps) {
  const [structure, setStructure] = useState<TableStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('columns')

  useEffect(() => {
    async function fetchStructure() {
      try {
        setLoading(true)
        setError(null)
        const result = await getTableStructure(workspaceId, tableName)
        setStructure(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load table structure')
      } finally {
        setLoading(false)
      }
    }

    fetchStructure()
  }, [workspaceId, tableName])

  if (loading) {
    return (
      <div className='flex flex-1 items-center justify-center bg-background'>
        <div className='flex items-center gap-3 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin text-primary' />
          Loading table structure...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-1 items-center justify-center p-4 bg-background'>
        <div className='max-w-lg rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive'>
          <div className='flex items-center gap-2 font-medium mb-2'>
            <AlertCircle className='h-5 w-5' />
            Error Loading Structure
          </div>
          <pre className='text-sm whitespace-pre-wrap font-mono'>{error}</pre>
        </div>
      </div>
    )
  }

  if (!structure) {
    return null
  }

  const tabs: { id: TabType; label: string; icon: typeof Columns3; count: number }[] = [
    { id: 'columns', label: 'Columns', icon: Columns3, count: structure.columns.length },
    { id: 'indexes', label: 'Indexes', icon: Key, count: structure.indexes.length },
    { id: 'foreign-keys', label: 'Foreign Keys', icon: Link, count: structure.foreignKeys.length },
  ]

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-background p-4'>
      <Card className='flex-1 flex flex-col overflow-hidden'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-lg font-mono flex items-center gap-2'>
            <Columns3 className='h-5 w-5 text-primary' />
            {structure.tableName}
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 flex flex-col overflow-hidden px-0'>
          {/* Internal Tabs */}
          <div className='flex items-center border-b border-border px-6 gap-1'>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    'border-b-2 -mb-px',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <Icon className='h-4 w-4' />
                  {tab.label}
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-md font-semibold',
                      isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className='flex-1 overflow-auto px-6 py-4'>
            {activeTab === 'columns' && <ColumnsTable columns={structure.columns} />}
            {activeTab === 'indexes' && <IndexesTable indexes={structure.indexes} />}
            {activeTab === 'foreign-keys' && <ForeignKeysTable foreignKeys={structure.foreignKeys} />}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
