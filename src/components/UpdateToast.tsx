import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * PWA update prompt.
 *
 * The service worker is configured with registerType: 'prompt', so when a new
 * version is deployed the new SW downloads and waits. This toast asks the user
 * to refresh; clicking it activates the waiting SW and reloads.
 *
 * Only app shell files (JS/CSS/HTML) are replaced — IndexedDB (hostels) and
 * the map-tile cache are never touched, so data survives every update.
 */
export default function UpdateToast() {
  const {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates on periodic visits (every load after the first).
      if (registration) {
        setInterval(async () => {
          try {
            await registration.update();
          } catch {
            // Network hiccup — the next interval will retry.
          }
          void swUrl;
        }, 60 * 60 * 1000); // hourly
      }
    },
  });

  const visible = offlineReady[0] || needRefresh[0];

  const close = () => {
    offlineReady[1](false);
    needRefresh[1](false);
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[70] max-w-lg mx-auto toast-in">
      <div
        className={`px-4 py-3 rounded-2xl border shadow-2xl text-sm font-medium backdrop-blur-xl flex items-center gap-3 ${
          needRefresh[0]
            ? 'bg-ink-900/90 border-iris-500/40 text-ink-100'
            : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
        }`}
      >
        {needRefresh[0] ? (
          <>
            <svg className="w-5 h-5 text-iris-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="flex-1 leading-snug">A new version is available. Refresh to update — your saved hostels are safe.</span>
            <button
              onClick={() => { void updateServiceWorker(true); }}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-b from-iris-500 to-iris-600 text-white hover:from-iris-400 hover:to-iris-500 transition-all active:scale-95 shadow-lg shadow-iris-500/30"
            >
              Refresh
            </button>
            <button
              onClick={close}
              className="flex-shrink-0 p-1.5 text-ink-400 hover:text-white rounded-lg transition-colors"
              aria-label="Dismiss update"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="flex-1">App ready to work offline</span>
            <button
              onClick={close}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors active:scale-95"
            >
              OK
            </button>
          </>
        )}
      </div>
    </div>
  );
}
