import { create } from 'zustand'

interface TableFinderStore {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useTableFinderStore = create<TableFinderStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))
