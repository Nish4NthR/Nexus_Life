import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { useThemeStore } from './store/useThemeStore.js';
import { useAuthStore } from './store/useAuthStore.js';
import './styles/global.css';
import './styles/animations.css';

useAuthStore.getState().initialize();

// Apply the stored / system theme to <html> BEFORE React mounts so the
// initial paint matches and we avoid a flash of the wrong theme.
useThemeStore.getState().init();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
