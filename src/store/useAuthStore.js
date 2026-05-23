import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const ENV_USERNAME = import.meta.env.VITE_APP_USERNAME;
const ENV_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,

      login: (username, password) => {
        const ok =
          !!ENV_USERNAME &&
          !!ENV_PASSWORD &&
          username === ENV_USERNAME &&
          password === ENV_PASSWORD;

        if (ok) {
          set({ isAuthenticated: true, username });
        }
        return ok;
      },

      logout: () => set({ isAuthenticated: false, username: null }),
    }),
    {
      name: 'nexuslife-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
      }),
    }
  )
);
