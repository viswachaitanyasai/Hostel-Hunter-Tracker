import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    // Generated output — Gradle's build tree, `cap sync`'s copied web bundle and
    // Capacitor's own injected bridge JS. Linting it reports on code we don't own
    // (it was flagging two unused-disable-directive warnings in native-bridge.js).
    'android/app/build',
    'android/build',
    'android/.gradle',
    'android/app/src/main/assets',
    'android/capacitor-cordova-android-plugins',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
