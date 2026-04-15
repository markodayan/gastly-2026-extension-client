import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    generateIconsPlugin(),
    react(),
    tailwindcss(),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: 'public/manifest.json',
    //       dest: '.',
    //     },
    //   ],
    // }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'index.html'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') {
            return 'background.js';
          }

          return 'assets/[name].js';
        },
      },
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
      const input = path.resolve('public/logo.png');
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
      console.log('Generated icons');
    },
  };
}
