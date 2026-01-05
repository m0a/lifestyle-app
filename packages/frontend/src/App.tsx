import { useEffect, useRef } from 'react';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/client';

export function App() {
  const { setUser, setLoading, isAuthenticated } = useAuthStore();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only run auth check once
    if (hasCheckedAuth.current) {
      return;
    }
    hasCheckedAuth.current = true;

    const checkAuth = async () => {
      // Skip API check if not authenticated (no stored session)
      // isLoading is already false, so unauthenticated users see login redirect immediately
      if (!isAuthenticated) {
        return;
      }

      // For authenticated users, show loading while verifying session
      setLoading(true);

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
  }, [setUser, setLoading, isAuthenticated]);

  return null;
}
