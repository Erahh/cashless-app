import { create } from 'zustand';

// A simple global store to share the "hide balance" state across screens
export const useAppStore = create((set) => ({
    hideBalance: false,
    toggleHideBalance: () => set((state) => ({ hideBalance: !state.hideBalance })),
}));
