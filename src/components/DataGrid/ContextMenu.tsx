import { useEffect, useRef } from 'react'

import { copyCellToClipboard, copyRowsToClipboard, copyRowToClipboard } from '@/lib/clipboard'
import type { Column } from '@/types/database'
import { Copy } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  cellValue: string | number | boolean | null
  rowData: Record<string, string | number | boolean | null>
  allRows: Record<string, string | number | boolean | null>[]
  columns: Column[]
}

export function ContextMenu({ x, y, onClose, cellValue, rowData, allRows, columns }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleCopyCell = () => {
    copyCellToClipboard(cellValue)
    onClose()
  }

  const handleCopyRow = () => {
    const rowArray = columns.map((_, idx) => rowData[String(idx)])
    copyRowToClipboard(rowArray)
    onClose()
  }

  const handleCopyAll = () => {
    const rowArrays = allRows.map((row) => columns.map((_, idx) => row[String(idx)]))
    copyRowsToClipboard(rowArrays, columns)
    onClose()
  }

  // Calculate position with viewport bounds check
  const menuWidth = 180
  const menuHeight = 120
  const posX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x
  const posY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : y

  return (
    <div
      ref={menuRef}
      className='fixed z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg'
      style={{ left: `${posX}px`, top: `${posY}px` }}
    >
      <button
        className='flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
        onClick={handleCopyCell}
      >
        <Copy className='h-4 w-4' />
        Copy Cell
      </button>
      <button
        className='flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
        onClick={handleCopyRow}
      >
        <Copy className='h-4 w-4' />
        Copy Row
      </button>
      <div className='my-1 h-px bg-border' />
      <button
        className='flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
        onClick={handleCopyAll}
      >
        <Copy className='h-4 w-4' />
        Copy All Rows
      </button>
    </div>
  )
}
