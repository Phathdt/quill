export interface KeyboardShortcut {
  id: string
  keys: string       // macOS display (Cmd+...)
  keysCtrl?: string  // Linux/Windows display (Ctrl+...)
  description: string
  category: 'editor' | 'navigation' | 'grid' | 'general'
}

/** Detect platform: 'mac' | 'other' (Linux, Windows) */
export function isMac(): boolean {
  // userAgentData is the modern API, navigator.platform is deprecated but more widely supported
  if (typeof navigator !== 'undefined') {
    if ('userAgentData' in navigator) {
      return (navigator as Navigator & { userAgentData: { platform: string } }).userAgentData.platform === 'macOS'
    }
    return navigator.platform.toUpperCase().includes('MAC')
  }
  return false
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
    keysCtrl: 'Ctrl+K',
    description: 'Open command palette',
    category: 'general',
  },
  {
    id: 'go-to-table',
    keys: 'Cmd+P',
    keysCtrl: 'Ctrl+P',
    description: 'Go to table',
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
    keysCtrl: 'Ctrl+Enter',
    description: 'Execute query',
    category: 'editor',
  },
  {
    id: 'format-sql',
    keys: 'Cmd+Shift+F',
    keysCtrl: 'Ctrl+Shift+F',
    description: 'Format SQL',
    category: 'editor',
  },
  {
    id: 'save-query',
    keys: 'Cmd+Shift+S',
    keysCtrl: 'Ctrl+Shift+S',
    description: 'Save query',
    category: 'editor',
  },
  // Navigation
  {
    id: 'new-tab',
    keys: 'Cmd+T',
    keysCtrl: 'Ctrl+T',
    description: 'New query tab',
    category: 'navigation',
  },
  {
    id: 'close-tab',
    keys: 'Cmd+W',
    keysCtrl: 'Ctrl+W',
    description: 'Close current tab',
    category: 'navigation',
  },
  {
    id: 'toggle-sidebar',
    keys: 'Cmd+B',
    keysCtrl: 'Ctrl+B',
    description: 'Toggle sidebar',
    category: 'navigation',
  },
  // Grid
  {
    id: 'record-detail',
    keys: 'Cmd+D',
    keysCtrl: 'Ctrl+D',
    description: 'Toggle record detail',
    category: 'grid',
  },
  {
    id: 'copy-cell',
    keys: 'Cmd+C',
    keysCtrl: 'Ctrl+C',
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
  return isMac() ? shortcut.keys : (shortcut.keysCtrl ?? shortcut.keys)
}
