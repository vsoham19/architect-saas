import { create } from 'zustand';

interface ThemeState {
  theme: 'light';
  toggleTheme: () => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',

  toggleTheme: () => {
    // No-op to disable dark mode toggling
  },

  initializeTheme: () => {
    // Force light mode
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
}));
