import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import manifest from './manifest.dev.json';

export default defineConfig({
  plugins: [generateIconsPlugin(), react(), tailwindcss(), crx({ manifest })],
  build: {
    outDir: 'dist-dev',
  },
  server: {
    cors: {
      origin: /chrome-extension:\/\/.*/,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

function generateIconsPlugin() {
  return {
    name: 'generate-icons',
    async buildStart() {
      const input = path.resolve('public/dev.png');
      const outputDir = path.resolve('public');
      const sizes = [16, 32, 48, 128];

      for (const size of sizes) {
        await sharp(input)
          .resize(size, size)
          .png()
          .toFile(path.join(outputDir, `icon${size}.png`));
      }

      const ico = await pngToIco([
        path.join(outputDir, 'icon16.png'),
        path.join(outputDir, 'icon32.png'),
        path.join(outputDir, 'icon48.png'),
      ]);

      await fs.writeFile(path.join(outputDir, 'favicon.ico'), ico);
      console.log('Generated icons from dev.png');
    },
  };
}
