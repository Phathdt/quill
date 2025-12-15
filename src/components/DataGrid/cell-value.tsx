import { formatValue } from '@/lib/value-parser'

interface CellValueProps {
  value: unknown
}

/**
 * Displays cell value with type-specific styling
 * - NULL: muted italic
 * - Boolean: amber color
 * - Number: emerald color
 * - String/Other: default with tooltip
 */
export function CellValue({ value }: CellValueProps) {
  if (value === null) {
    return <span className='text-muted-foreground/50 italic'>NULL</span>
  }

  if (typeof value === 'boolean') {
    return <span className='text-amber-400'>{String(value)}</span>
  }

  if (typeof value === 'number') {
    return <span className='text-emerald-400'>{value}</span>
  }

  const str = formatValue(value)
  return <span title={str}>{str}</span>
}
