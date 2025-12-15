import { useEffect } from 'react'

import { useCommandPaletteStore } from '@/stores/commandPaletteStore'

/**
 * Hook to handle keyboard shortcuts for command palette
 * Manages Cmd+K to open/close and ESC to close
 */
export function useCommandPaletteKeyboard() {
  const isOpen = useCommandPaletteStore((s) => s.isOpen)
  const close = useCommandPaletteStore((s) => s.close)
  const toggle = useCommandPaletteStore((s) => s.toggle)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle, isOpen, close])

  return { isOpen, close }
}
