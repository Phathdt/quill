import { create } from 'zustand'

export interface CommandAction {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string[]
  category: 'navigation' | 'workspace' | 'connection' | 'query' | 'general' | 'template'
  action: () => void
  keywords?: string[]
}

interface CommandPaletteStore {
  isOpen: boolean
  searchQuery: string

  open: () => void
  close: () => void
  toggle: () => void
  setSearchQuery: (query: string) => void
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
  isOpen: false,
  searchQuery: '',

  open: () => set({ isOpen: true, searchQuery: '' }),
  close: () => set({ isOpen: false, searchQuery: '' }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen, searchQuery: '' })),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
