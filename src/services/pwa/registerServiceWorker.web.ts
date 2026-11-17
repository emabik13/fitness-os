/** Registers the offline service worker in production web builds. */
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const base = (process.env.EXPO_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  const register = () => {
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      // Offline support is an enhancement; the app works without it.
    });
  };
  // The bundle may run after `load` has already fired.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
