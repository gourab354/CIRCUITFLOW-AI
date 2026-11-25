import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  showAuthModal: boolean;
  authMode: 'login' | 'signup';
  isLoading: boolean;
  error: string | null;

  // Actions
  setShowAuthModal: (show: boolean, mode?: 'login' | 'signup') => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  setError: (err: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  demoLogin: () => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const API_BASE = 'http://127.0.0.1:8000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      showAuthModal: false,
      authMode: 'login',
      isLoading: false,
      error: null,

      setShowAuthModal: (show, mode) => {
        set({
          showAuthModal: show,
          authMode: mode || get().authMode,
          error: null
        });
      },

      setAuthMode: (mode) => set({ authMode: mode, error: null }),
      setError: (error) => set({ error }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            set({ error: data.detail || 'Failed to login', isLoading: false });
            return false;
          }
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            showAuthModal: false,
            isLoading: false,
            error: null
          });
          return true;
        } catch (e: any) {
          set({ error: e.message || 'Network error connecting to backend', isLoading: false });
          return false;
        }
      },

      signup: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            set({ error: data.detail || 'Registration failed', isLoading: false });
            return false;
          }
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            showAuthModal: false,
            isLoading: false,
            error: null
          });
          return true;
        } catch (e: any) {
          set({ error: e.message || 'Network error connecting to backend', isLoading: false });
          return false;
        }
      },

      demoLogin: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/demo-login`, { method: 'POST' });
          const data = await res.json();
          if (!res.ok) {
            set({ error: data.detail || 'Demo login failed', isLoading: false });
            return false;
          }
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            showAuthModal: false,
            isLoading: false,
            error: null
          });
          return true;
        } catch (e: any) {
          set({ error: e.message || 'Network error connecting to backend', isLoading: false });
          return false;
        }
      },

      logout: () => {
        const { token } = get();
        if (token) {
          fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => {});
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.authenticated && data.user) {
            set({ user: data.user, isAuthenticated: true });
          } else {
            set({ user: null, token: null, isAuthenticated: false });
          }
        } catch {
          // If offline, keep local user state
        }
      }
    }),
    {
      name: 'circuitflow-auth-storage',
      partialize: (state: AuthState) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
