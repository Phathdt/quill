import { create } from 'zustand'

interface UiState {
  leftPanelOpen: boolean
  toggleLeftPanel: () => void
  setLeftPanelOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  leftPanelOpen: true,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
}))
