import { create } from 'zustand';

/**
 * App-wide dark / light theme store.
 *
 * Persists to localStorage['nl-theme']. On first load (no stored value), reads
 * the OS preference via matchMedia. Applies the theme by setting
 * `data-theme="dark|light"` on the <html> element — global.css and the
 * tailwind palette resolve their CSS variables off this attribute.
 *
 * Call `init()` BEFORE React renders to avoid a flash of the wrong theme.
 */

const STORAGE_KEY = 'nl-theme';

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* private mode / unavailable */
  }
  return null;
}

function detectSystem() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {
    /* SSR / unsupported */
  }
  return 'dark';
}

function apply(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  // color-scheme hint so native UI (scrollbars, form controls) follow suit
  document.documentElement.style.colorScheme = theme;
}

export const useThemeStore = create((set, get) => ({
  theme: readStored() || detectSystem(),

  /** Apply the current theme to <html>. Call once before render. */
  init: () => {
    apply(get().theme);
  },

  setTheme: (theme) => {
    if (theme !== 'dark' && theme !== 'light') return;
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },

  toggle: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
}));
