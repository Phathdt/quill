export interface KeyboardShortcut {
  id: string
  keys: string
  keysWindows?: string // Override for Windows
  description: string
  category: 'editor' | 'navigation' | 'grid' | 'general'
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // General
  {
    id: 'help',
    keys: 'F1',
    description: 'Show keyboard shortcuts',
    category: 'general',
  },
  {
    id: 'command-palette',
    keys: 'Cmd+K',
    keysWindows: 'Ctrl+K',
    description: 'Open command palette',
    category: 'general',
  },
  {
    id: 'escape',
    keys: 'Esc',
    description: 'Cancel editing / Close modal',
    category: 'general',
  },
  // Editor
  {
    id: 'execute-query',
    keys: 'Cmd+Enter',
    keysWindows: 'Ctrl+Enter',
    description: 'Execute query',
    category: 'editor',
  },
  {
    id: 'format-sql',
    keys: 'Cmd+Shift+F',
    keysWindows: 'Ctrl+Shift+F',
    description: 'Format SQL',
    category: 'editor',
  },
  {
    id: 'save-query',
    keys: 'Cmd+Shift+S',
    keysWindows: 'Ctrl+Shift+S',
    description: 'Save query',
    category: 'editor',
  },
  // Navigation
  {
    id: 'new-tab',
    keys: 'Cmd+T',
    keysWindows: 'Ctrl+T',
    description: 'New query tab',
    category: 'navigation',
  },
  {
    id: 'close-tab',
    keys: 'Cmd+W',
    keysWindows: 'Ctrl+W',
    description: 'Close current tab',
    category: 'navigation',
  },
  {
    id: 'toggle-sidebar',
    keys: 'Cmd+B',
    keysWindows: 'Ctrl+B',
    description: 'Toggle sidebar',
    category: 'navigation',
  },
  // Grid
  {
    id: 'record-detail',
    keys: 'Cmd+D',
    keysWindows: 'Ctrl+D',
    description: 'Toggle record detail',
    category: 'grid',
  },
  {
    id: 'copy-cell',
    keys: 'Cmd+C',
    keysWindows: 'Ctrl+C',
    description: 'Copy cell value',
    category: 'grid',
  },
]

export const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  editor: 'Query Editor',
  navigation: 'Navigation',
  grid: 'Data Grid',
}

export const CATEGORY_ORDER = ['general', 'editor', 'navigation', 'grid']

export function getShortcutsByCategory(): Record<string, KeyboardShortcut[]> {
  return KEYBOARD_SHORTCUTS.reduce(
    (acc, shortcut) => {
      acc[shortcut.category] = acc[shortcut.category] || []
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, KeyboardShortcut[]>
  )
}

export function getDisplayKeys(shortcut: KeyboardShortcut): string {
  const isMac = navigator.platform.toUpperCase().includes('MAC')
  return isMac ? shortcut.keys : (shortcut.keysWindows ?? shortcut.keys)
}
