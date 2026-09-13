// Google Drive is optional after the Supabase migration. This compatibility
// store keeps legacy settings UI from making Drive a login requirement.
import { create } from 'zustand';
export const useDriveAuthStore = create((set) => ({
  token: null, ready: false, signingIn: false, error: null,
  init: async () => set({ ready: true }),
  signIn: async () => { set({ error: 'Google Drive backup is optional and is not enabled yet.' }); },
  signOut: () => set({ token: null }),
  isAuthorized: () => false,
}));
