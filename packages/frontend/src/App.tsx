import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/api';
import type { AuthResponse } from '@lifestyle-app/shared';

export function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get<AuthResponse>('/api/auth/me');
        setUser(response.user);
      } catch {
        setUser(null);
      }
    };

    checkAuth();
  }, [setUser, setLoading]);

  return null;
}
