import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Set BASE_PATH=/blinis-playroom/ when building for GitHub Pages; defaults to the site root.
const base = process.env.BASE_PATH || '/';

/**
 * Static hosts without rewrites (GitHub Pages) need a real file for /parent/.
 * Emit copies of index.html so /parent/ works and unknown paths fall back to the app.
 */
function staticRoutes(): Plugin {
  return {
    name: 'blini-static-routes',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') return;
      for (const fileName of ['parent/index.html', '404.html']) {
        this.emitFile({ type: 'asset', fileName, source: html.source });
      }
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    staticRoutes(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: base,
        name: "Blini's Playroom",
        short_name: 'Blini',
        description: 'A calm, open-ended toy app for little ones.',
        start_url: base,
        scope: base,
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#EAF4FB',
        theme_color: '#EAF4FB',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything (toys are code, sounds are synthesised) is precached: fully offline after first load.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['404.html'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
