import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@lifestyle-app/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state, error) => {
        // Mark hydration as complete regardless of auth state or errors
        // This allows App.tsx to properly handle the loading state
        if (!error && state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
