import { Badge } from '@/components/ui/badge'
import type { ForeignKey } from '@/types/schema'
import { Link } from 'lucide-react'

interface ForeignKeysTableProps {
  foreignKeys: ForeignKey[]
}

export function ForeignKeysTable({ foreignKeys }: ForeignKeysTableProps) {
  return (
    <div className='overflow-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border bg-muted/50'>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Constraint Name</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Column</th>
            <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>References</th>
          </tr>
        </thead>
        <tbody>
          {foreignKeys.map((fk) => (
            <tr key={fk.name} className='border-b border-border hover:bg-accent/50 transition-colors'>
              <td className='px-4 py-3 font-mono font-medium text-foreground'>{fk.name}</td>
              <td className='px-4 py-3'>
                <Badge variant='outline' className='font-mono bg-blue-500/10 text-blue-400 border-blue-500/30'>
                  <Link className='w-3 h-3 mr-1' />
                  {fk.column}
                </Badge>
              </td>
              <td className='px-4 py-3'>
                <div className='flex items-center gap-2 font-mono text-muted-foreground'>
                  <Badge variant='outline' className='font-mono'>
                    {fk.referencesTable}
                  </Badge>
                  <span className='text-xs'>→</span>
                  <span className='text-foreground'>{fk.referencesColumn}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {foreignKeys.length === 0 && <div className='py-8 text-center text-muted-foreground'>No foreign keys found</div>}
    </div>
  )
}
