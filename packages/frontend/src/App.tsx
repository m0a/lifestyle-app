import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/client';

export function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.auth.me.$get();
        if (!res.ok) {
          setUser(null);
          return;
        }
        const response = await res.json();
        setUser(response.user);
      } catch {
        setUser(null);
      }
    };

    checkAuth();
  }, [setUser, setLoading]);

  return null;
}
