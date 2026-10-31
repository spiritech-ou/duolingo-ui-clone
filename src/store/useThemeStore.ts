import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return choice;
}

function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset['theme'] = resolveTheme(choice);
}

interface ThemeState {
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      choice: 'dark',
      setChoice: (choice) => {
        applyTheme(choice);
        set({ choice });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ choice: state.choice }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.choice);
      },
    },
  ),
);
