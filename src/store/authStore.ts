import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
  createdAt?: string;
  isPublicAlbum?: boolean;
  tokens?: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string; email?: string; avatar?: string }) => Promise<void>;
}

const safeStorage = createJSONStorage(() => localStorage);

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      register: async (email, password, firstName, lastName) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Erreur lors de l'inscription");
          }

          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'inscription";
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erreur de connexion');
          }

          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      checkAuth: async () => {
        const state = useAuthStore.getState();
        const token = state.token;
        if (!token) {
          set({ user: null, isInitialized: true });
          return;
        }

        set({ isLoading: true, isInitialized: true });
        try {
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            set({ user: data.user, token });
          } else {
            set({ user: null, token: null });
          }
        } catch {
          set({ user: null, token: null });
        } finally {
          set({ isLoading: false });
        }
      },

      updateProfile: async (data) => {
        const state = useAuthStore.getState();
        const token = state.token;
        if (!token) throw new Error('Non authentifié');

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Échec de la mise à jour');
          }

          const result = await response.json();
          set({ user: result.user, error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Échec de la mise à jour';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'panini-auth',
      storage: safeStorage,
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
