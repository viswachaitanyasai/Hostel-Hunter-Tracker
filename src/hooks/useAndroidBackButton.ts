import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Routes the Android hardware back button into in-app navigation.
 *
 * Without this, a back press on a sub-page (e.g. /hostel/:id) closes the whole
 * app: Capacitor's core has no back handling at all, so the press falls through
 * to the Activity's default, which finishes it. The `@capacitor/app` plugin
 * registers an OnBackPressedCallback, but with no JS listener it only drives the
 * WebView history (leaving back a no-op at the root), so we take it over:
 *
 *   - there is an earlier page in this app  -> go back
 *   - we're at the root                     -> exit the app, which is what the
 *                                              back button is expected to do
 *
 * The test for "can go back" is `window.history.state.idx`, React Router v7's
 * own history depth (BrowserRouter writes it on every push/replace via
 * getUrlBasedHistory). That reflects exactly what `navigate(-1)` will do, and is
 * more trustworthy here than the WebView's `canGoBack()`, which can drift from
 * the router — e.g. after a `replace` navigation, where the WebView still counts
 * an entry the router no longer does.
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  // Kept in a ref so the listener is registered once instead of being torn down
  // and re-added whenever the identity of `navigate` changes. The ref is
  // refreshed in an effect (never during render) - the listener reads
  // `.current` at press time, so it always sees the latest navigate.
  const navigateRef = useRef(navigate);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    let cancelled = false;
    let remove: (() => void) | undefined;

    void (async () => {
      const { App } = await import('@capacitor/app');
      if (cancelled) return;

      const handle = await App.addListener('backButton', () => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) {
          navigateRef.current(-1);
        } else {
          void App.exitApp();
        }
      });

      // The component can unmount while the plugin import is in flight.
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
}
