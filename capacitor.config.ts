import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hostelfinder.app',
  appName: 'HostelFinder',
  webDir: 'dist',
  plugins: {
    /**
     * The app is dark in both device modes (`color-scheme: dark` in index.css),
     * but Capacitor's SystemBars plugin defaults to `DEFAULT`, which picks the
     * bar icon colour from the *device's* light/dark setting — so on a phone in
     * light mode it asked for dark icons on the dark bars this theme now sets.
     * Pin it so the bars always get light icons.
     */
    SystemBars: {
      style: 'DARK',
    },
  },
};

export default config;
