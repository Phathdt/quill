import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getDisplayKeys,
  getShortcutsByCategory,
} from '@/lib/keyboard-shortcuts-config'

interface KeyboardShortcutsOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function KeyboardKey({ children }: { children: string }) {
  return <kbd className='px-2 py-1 bg-muted rounded text-xs font-mono'>{children}</kbd>
}

function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  // Split keys by + but keep "Cmd+Shift+F" as ["Cmd", "Shift", "F"]
  const keyParts = keys.split('+')

  return (
    <div className='flex items-center justify-between py-2'>
      <span className='text-sm text-foreground'>{description}</span>
      <div className='flex items-center gap-1'>
        {keyParts.map((key, i) => (
          <span key={i} className='flex items-center gap-1'>
            <KeyboardKey>{key}</KeyboardKey>
            {i < keyParts.length - 1 && <span className='text-muted-foreground text-xs'>+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsOverlay({ open, onOpenChange }: KeyboardShortcutsOverlayProps) {
  const shortcutsByCategory = getShortcutsByCategory()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {CATEGORY_ORDER.map((category) => {
            const shortcuts = shortcutsByCategory[category]
            if (!shortcuts?.length) return null

            return (
              <div key={category}>
                <h3 className='text-sm font-semibold text-muted-foreground mb-2'>{CATEGORY_LABELS[category]}</h3>
                <div className='divide-y divide-border'>
                  {shortcuts.map((shortcut) => (
                    <ShortcutRow key={shortcut.id} keys={getDisplayKeys(shortcut)} description={shortcut.description} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className='text-xs text-muted-foreground text-center pt-2 border-t'>
          Press <KeyboardKey>?</KeyboardKey> to toggle this overlay
        </div>
      </DialogContent>
    </Dialog>
  )
}
