import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  isNewGroupModalOpen: boolean;
  isStoriesOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setIsNewGroupModalOpen: (open: boolean) => void;
  setIsStoriesOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true, // open by default on desktop
  theme: 'system',
  isNewGroupModalOpen: false,
  isStoriesOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  setIsNewGroupModalOpen: (open) => set({ isNewGroupModalOpen: open }),
  setIsStoriesOpen: (open) => set({ isStoriesOpen: open }),
}));
