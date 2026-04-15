# Gastly 2026 Extension Client

Leverages MV3. Follows a storage-first model.
This application contains two primary components:

1. <b>Service Worker</b>
2. <b>Popup Application</b>

- Service worker talks to the network
- Popup talks to `chrome.storage.local`
- Popup subscribes to storage changes
- Badge is controlled by the worker

# Important setup for development testing and deployment

I need to configure Vite to:

1. Treat my background worker as an entry point.
2. Output it as a JS file into `dist/`
3. Copy my `manifest.json` into `dist/`

First, install a plugin to copy manifest:

```bash
npm install -D vite-plugin-static-copy
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        },
      ],
    }),
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
```

Having now done that, the `src/background/index.ts` script will be automatically compiled into a JS script that will be built into `dist/background.js`. We can now create our `public/manifest.json` file:

```json
{
  "manifest_version": 3,
  "name": "Gastly",
  "version": "0.1.0",
  "action": {
    "default_popup": "index.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "permissions": ["storage", "alarms"],
  "host_permissions": ["http://localhost/*", "https://extension-api.gastly.tools/*"]
}
```

Move API URLs into `.env.development` and `.env.production`.
This will allow me to be able to test the client for either localhost (`npm run build:dev` to get dist for local running) or in production where the API is communicated with over Internet network (`npm run build:prod` to get dist for production deployment to Chrome store).

```bash
# .env.development
VITE_API_HTTP_BASE=http://localhost:5001
VITE_API_WS_BASE=ws://localhost:5001
```

```bash
# .env.production
VITE_API_HTTP_BASE=https://gastly-extension-api.tools
VITE_API_WS_BASE=wss://gastly-extension-api.tools
```

Now add two different build scripts to `package.json`:

```json
    "build:dev": "tsc -b && vite build --mode development",
    "build:prod": "tsc -b && vite build --mode production",
```

# Running in Development Mode

In order to run both the Popup and the service worker, we need to run the build command:

```
npm run build
```

The `dist/` should have this structure:

```
dist/
  manifest.json
  index.html
  background.js   ✅ compiled from TS
  assets/
    ...
```

Now we can load the application into Chrome:

- go to `chrome://extensions`
- enable <b>Developer Mode</b>
- click <b>Load unpacked</b>
- select <b>dist/</b>

After this, you will be able to click the "Inspects views <b>service worker</b>" link that will open the chrome devtools for the application. And you are all set to go.
Whenever you update the application, simply just run the build again (`npm run build:dev` or `npm run build:prod`) and click the refresh button on the extension card for the application (on the `chrome://extensions` page).

> Future change is to improve the hot reload even more (see ChatGPT discussion to learn more about that)

# Deploying to Chrome Web Store

You need to do 3 things:

1. Update the app version in `public/manifest.json` (increment from whatever is currently on the Chrome Store).
2. Build the application (will be output to `dist`) -> `npm run build:prod`
3. Generate the package zip file `npm run package`

From here, you just upload this package to the chrome store.

---

### First Service Worker Functionality

- Initialise default preferences
- Fetch initial block snapshot via HTTP
- Open WebSocket for block updates
- Poll spot rates via `chrome.alarms`

### Service worker responsibilities

- initialise defaults on install/startup
- open or re-open WebSocket when needed
- fetch spot prices on alarm
- update badge
- cache normalised data
- maybe expose lightweight message handlers for popup actions

### Popup application responsibilities

- read cached state once on mount
- react to `chrome.storage.onChanged`
- render instantly from cached values
- maybe allow changing preferences

# Runtime Model

<b>On Install</b>:

- set default preferences
- fetch initial block snapshot over HTTP
- fetch initial spot prices
- update badge
- schedule the spot-price alarm

<b>On startup.worker wake</b>:

- read preferences + cached state
- restore badge from cached block
- ensure alarm exists
- ensure WebSocket is connected

<b>On WebSocket message</b>:

- normalise block payload
- compute gas totals
- write updated `block` cache
- update badge

<b>On alarm</b>:

- fetch `/spot`
- cache spots
- if WebSocket is dead, attempt reconnect

<b>On popup open</b>

- render immediately from cached storage
- subscribe to storage changes
- no depedency on live network

<br />

---

# Next Tasks

- Deploy to app store (comment out debugs)
- Profiling Analysis Changes
- Re-Design the UI (do some sketches)
