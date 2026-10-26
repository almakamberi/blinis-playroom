import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: '#EAF4FB' } },
    apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background: '#EAF4FB' } },
  },
  images: ['public/icon.svg'],
});
