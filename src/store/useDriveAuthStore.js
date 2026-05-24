import { create } from 'zustand';
import { loadGIS } from '../utils/loadGIS.js';
import { setTokenProvider, resetDriveCache } from '../drive/driveClient.js';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file email';
const STORAGE_KEY = 'nexuslife-drive-token';

function loadStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    if (Date.now() >= parsed.expiresAt - 60_000) return null; // expired or about to
    return parsed;
  } catch {
    return null;
  }
}

function saveToken(t) {
  if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  else localStorage.removeItem(STORAGE_KEY);
}

export const useDriveAuthStore = create((set, get) => {
  // Wire the Drive client to read the current token from this store immediately,
  // so it works after a page reload (when init() never runs because the user
  // already has a valid token in localStorage and skips the Login flow).
  setTokenProvider(() => {
    const t = get().token;
    return t && Date.now() < t.expiresAt ? t.accessToken : null;
  });

  return {
  // token = { accessToken, expiresAt, email? }
  token: loadStoredToken(),
  ready: false,
  signingIn: false,
  error: null,
  tokenClient: null,

  /**
   * Initialize the OAuth token client. Idempotent.
   */
  init: async () => {
    if (get().tokenClient) return;
    if (!CLIENT_ID) {
      set({ error: 'VITE_GOOGLE_CLIENT_ID is not set' });
      return;
    }

    try {
      const google = await loadGIS();

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error) {
            set({ signingIn: false, error: response.error_description || response.error });
            return;
          }
          const expiresAt = Date.now() + (response.expires_in - 30) * 1000;
          const next = { accessToken: response.access_token, expiresAt };
          saveToken(next);
          set({ token: next, signingIn: false, error: null });
        },
      });

      set({ tokenClient, ready: true });
    } catch (err) {
      set({ error: err.message || String(err), ready: false });
    }
  },

  /**
   * Trigger the OAuth popup. Resolves on success; rejects on error / popup close.
   */
  signIn: async ({ silent = false } = {}) => {
    await get().init();
    const client = get().tokenClient;
    if (!client) throw new Error('OAuth client not initialized');
    set({ signingIn: true, error: null });
    // `prompt: ''` lets Google skip the consent screen for already-granted users
    client.requestAccessToken({ prompt: silent ? '' : 'consent' });
  },

  signOut: () => {
    const t = get().token;
    if (t?.accessToken && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(t.accessToken, () => {});
      } catch {}
    }
    saveToken(null);
    resetDriveCache();
    set({ token: null });
  },

  isAuthorized: () => {
    const t = get().token;
    return !!t && Date.now() < t.expiresAt;
  },
  };
});
