import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS } from '@/types/workspace'
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
}

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startRow = totalCount > 0 ? (page - 1) * pageSize + 1 : 0
  const endRow = Math.min(page * pageSize, totalCount)

  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  return (
    <div className='flex items-center gap-2'>
      {/* Row range display */}
      <span className='text-xs text-muted-foreground whitespace-nowrap'>
        {totalCount > 0 ? (
          <>
            <span className='text-foreground'>{startRow.toLocaleString()}</span>
            {'-'}
            <span className='text-foreground'>{endRow.toLocaleString()}</span>
            {' of '}
            <span className='text-foreground'>{totalCount.toLocaleString()}</span>
          </>
        ) : (
          'No rows'
        )}
      </span>

      {/* Navigation buttons */}
      <div className='flex items-center gap-0.5'>
        <Button
          size='icon'
          variant='ghost'
          className='h-6 w-6'
          onClick={() => onPageChange(1)}
          disabled={disabled || !canGoPrev}
          title='First page'
        >
          <ChevronFirst className='h-3.5 w-3.5' />
        </Button>
        <Button
          size='icon'
          variant='ghost'
          className='h-6 w-6'
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !canGoPrev}
          title='Previous page'
        >
          <ChevronLeft className='h-3.5 w-3.5' />
        </Button>
        <span className='text-xs px-1.5 min-w-[3rem] text-center'>
          {page} / {totalPages}
        </span>
        <Button
          size='icon'
          variant='ghost'
          className='h-6 w-6'
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !canGoNext}
          title='Next page'
        >
          <ChevronRight className='h-3.5 w-3.5' />
        </Button>
        <Button
          size='icon'
          variant='ghost'
          className='h-6 w-6'
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || !canGoNext}
          title='Last page'
        >
          <ChevronLast className='h-3.5 w-3.5' />
        </Button>
      </div>

      {/* Page size selector */}
      <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))} disabled={disabled}>
        <SelectTrigger className='h-6 w-[70px] text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={size.toString()} className='text-xs'>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
