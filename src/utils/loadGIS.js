/**
 * Loads Google Identity Services into the page once.
 * Resolves with `window.google.accounts.oauth2` ready to use.
 */
let _gisPromise = null;

export function loadGIS() {
  if (_gisPromise) return _gisPromise;
  _gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google);
      else reject(new Error('GIS loaded but oauth2 namespace missing'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return _gisPromise;
}
