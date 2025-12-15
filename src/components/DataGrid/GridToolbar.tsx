import { FilterPopup } from '@/components/Filter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { exportToCsv, exportToJson } from '@/lib/export'
import { useWorkspaceManagerStore } from '@/stores/workspaceManagerStore'
import type { Column } from '@/types/database'
import { Download } from 'lucide-react'

interface GridToolbarProps {
  rowCount: number
  executionTime: number
  columns: Column[]
  rows: unknown[][]
  onApplyFilters?: () => void
}

export function GridToolbar({ rowCount, executionTime, columns, rows, onApplyFilters }: GridToolbarProps) {
  const activeTab = useWorkspaceManagerStore((s) => s.getActiveTab())
  const isTableMode = activeTab?.type === 'table'

  const handleExportCsv = () => {
    exportToCsv(columns, rows, 'query-result.csv')
  }

  const handleExportJson = () => {
    exportToJson(columns, rows, 'query-result.json')
  }

  return (
    <div className='flex items-center justify-between border-b border-border bg-card px-3 py-1.5 text-xs'>
      <div className='flex items-center gap-4'>
        <span className='text-foreground'>
          <span className='text-muted-foreground'>Rows:</span> {rowCount.toLocaleString()}
        </span>

        {/* Filter button - only in table mode */}
        {isTableMode && columns.length > 0 && <FilterPopup columns={columns} onApply={onApplyFilters || (() => {})} />}
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <Button onClick={handleExportCsv} size='sm' variant='ghost' className='h-7 text-xs'>
            <Download className='h-3 w-3 mr-1' />
            CSV
          </Button>
          <Button onClick={handleExportJson} size='sm' variant='ghost' className='h-7 text-xs'>
            <Download className='h-3 w-3 mr-1' />
            JSON
          </Button>
        </div>
        <span className='text-muted-foreground'>
          Executed in{' '}
          <Badge variant='outline' className='text-emerald-400 border-emerald-400/30'>
            {executionTime}ms
          </Badge>
        </span>
      </div>
    </div>
  )
}
