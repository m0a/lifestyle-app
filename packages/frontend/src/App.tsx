import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/client';

export function App() {
  const { setUser, setLoading, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for zustand persist to finish hydrating from localStorage
    if (!_hasHydrated) {
      return;
    }

    const checkAuth = async () => {
      // Skip API check if not authenticated (no stored session)
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await api.auth.me.$get();
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Session invalid, clear user
          setUser(null);
        }
      } catch {
        // On error, keep existing auth state from localStorage
        // but mark loading as complete
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser, setLoading, isAuthenticated, _hasHydrated]);

  return null;
}
