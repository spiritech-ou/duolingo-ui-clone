/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import { resolveBasePath, spaFallbackPlugin } from './scripts/pages.ts';

// BASE_PATH is set only by `build:pages` / `preview:pages` (GitHub Pages sub path). Unset means "/".
const base = resolveBasePath(process.env['BASE_PATH']);

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const scriptsDir = fileURLToPath(new URL('./scripts', import.meta.url));
const storybookDir = fileURLToPath(new URL('./.storybook', import.meta.url));

export default defineConfig({
  base,
  plugins: [react(), spaFallbackPlugin(base)],
  resolve: {
    // '@scripts' lets tests import the one-off scripts without climbing relative paths.
    alias: { '@': srcDir, '@scripts': scriptsDir },
  },
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [srcDir] },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['tests/setup.ts'],
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: storybookDir })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
