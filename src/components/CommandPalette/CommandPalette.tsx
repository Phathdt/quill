import { useEffect, useRef } from 'react'

import { useCommandPalette, useCommandPaletteKeyboard } from '@/hooks'
import { cn } from '@/lib/utils'
import { Command } from 'cmdk'

import { CommandInput } from './CommandInput'
import { CommandList } from './CommandList'

export function CommandPalette() {
  const { actions } = useCommandPalette()

  // Keyboard handling extracted to hook
  const { isOpen, close } = useCommandPaletteKeyboard()

  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm' onClick={close} />

      {/* Dialog */}
      <div className='fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2'>
        <Command
          className={cn(
            'rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
            'overflow-hidden'
          )}
          shouldFilter={true}
        >
          <CommandInput ref={inputRef} />
          <CommandList actions={actions} />

          {/* Footer */}
          <div className='flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <kbd className='px-1.5 py-0.5 bg-muted rounded border border-border'>
                <span className='text-[10px]'>esc</span>
              </kbd>
              <span>to close</span>
            </div>
            <div className='flex items-center gap-2'>
              <kbd className='px-1.5 py-0.5 bg-muted rounded border border-border'>
                <span className='text-[10px]'>Enter</span>
              </kbd>
              <span>to select</span>
            </div>
          </div>
        </Command>
      </div>
    </>
  )
}
