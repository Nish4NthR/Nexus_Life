import { create } from 'zustand';
import { supabase, requireSupabase } from '../lib/supabase.js';
import { clearUserData } from './clearUserData.js';

function friendlyAuthError(error) {
  const message = error?.message || '';
  const code = error?.code || '';
  if (code === 'over_email_send_rate_limit' || /rate limit|email.*limit|too many requests/i.test(message)) {
    return 'Supabase email limit reached. Wait before requesting another email, or configure custom SMTP in Supabase.';
  }
  if (/invalid login credentials/i.test(message)) return 'Invalid email or password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email before signing in.';
  return message || 'Authentication failed. Please try again.';
}

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,
  initialized: false,

  initialize: async () => {
    if (!supabase) { set({ loading: false, initialized: true, error: 'Supabase is not configured.' }); return; }
    const { data, error } = await supabase.auth.getSession();
    set({ session: data?.session ?? null, user: data?.session?.user ?? null, loading: false, initialized: true, error: error?.message ?? null });
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({ session: nextSession, user: nextSession?.user ?? null, loading: false });
    });
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) { set({ error: friendlyAuthError(error) }); return { error }; }
    set({ session: data.session, user: data.user }); return { data };
  },

  signUp: async (email, password, displayName) => {
    set({ error: null });
    const { data, error } = await requireSupabase().auth.signUp({ email, password, options: { data: { full_name: displayName } } });
    if (error) { set({ error: friendlyAuthError(error) }); return { error }; }
    set({ session: data.session, user: data.user }); return { data };
  },

  resetPassword: async (email) => {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) set({ error: friendlyAuthError(error) }); return { error };
  },

  updatePassword: async (password) => {
    const { error } = await requireSupabase().auth.updateUser({ password });
    if (error) set({ error: friendlyAuthError(error) }); return { error };
  },

  logout: async () => { await supabase?.auth.signOut(); clearUserData(); set({ user: null, session: null }); },
  clearError: () => set({ error: null }),
}));
