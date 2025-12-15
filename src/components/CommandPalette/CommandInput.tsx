import { forwardRef } from 'react'

import { Command } from 'cmdk'
import { Search } from 'lucide-react'

export const CommandInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Command.Input>>(
  (props, ref) => {
    return (
      <div className='flex items-center border-b border-border px-3'>
        <Search className='mr-2 h-4 w-4 shrink-0 opacity-50' />
        <Command.Input
          ref={ref}
          className='flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
          placeholder='Type a command or search...'
          {...props}
        />
      </div>
    )
  }
)

CommandInput.displayName = 'CommandInput'
