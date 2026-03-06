import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
        const { user, accessToken } = response.data.data;

        // Check if user has admin role
        if (user.role !== 'admin' && user.role !== 'super_admin') {
          throw new Error('Access denied. Admin privileges required.');
        }

        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
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
        let { accessToken } = get();
        
        // Check for discrete admin access token from main website
        const discreteToken = localStorage.getItem('bao_admin_token');
        if (discreteToken && !accessToken) {
          accessToken = discreteToken;
          // Clear the discrete token after consuming it
          localStorage.removeItem('bao_admin_token');
          set({ accessToken });
        }
        
        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        try {
          const response = await api.get('/auth/me');
          const user = response.data.data;

          if (user.role !== 'admin' && user.role !== 'super_admin') {
            throw new Error('Not admin');
          }

          set({
            user,
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
      name: 'baombao-admin-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);

// Initialize auth check on load
useAuthStore.getState().checkAuth();
