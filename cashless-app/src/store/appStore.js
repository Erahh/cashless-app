import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A simple global store to share the "hide balance" state across screens, persisted to storage
export const useAppStore = create(
    persist(
        (set) => ({
            hideBalance: false,
            toggleHideBalance: () => set((state) => ({ hideBalance: !state.hideBalance })),
        }),
        {
            name: 'app-storage', // name of the item in the storage
            storage: createJSONStorage(() => AsyncStorage), // Use AsyncStorage
        }
    )
);
