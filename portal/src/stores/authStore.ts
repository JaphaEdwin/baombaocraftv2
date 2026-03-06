import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, accessToken } = response.data;

        if (user.role !== 'customer') {
          throw new Error('Please use the admin portal');
        }

        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      register: async (data) => {
        const response = await api.post('/auth/register', data);
        const { user, accessToken } = response.data;

        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {});
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        try {
          const response = await api.get('/auth/me');
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'customer-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
    }
  )
);

// Check auth on load
useAuthStore.getState().checkAuth();
