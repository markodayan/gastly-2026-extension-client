# Gastly 2026 Extension Client

Leverages MV3. Follows a storage-first model.
This application contains two primary components:

1. <b>Service Worker</b>
2. <b>Popup Application</b>

- Service worker talks to the network
- Popup talks to `chrome.storage.local`
- Popup subscribes to storage changes
- Badge is controlled by the worker

# Working in development mode

Development mode leverages CRXJS to provide a hot-reload dev setup for working on the browser app without needing to manually rebuild everytime you make changes. It depends on its own manifest file and build configs:

- Development manifest file at `manifest.dev.json`
- Development Vite config file at `vite.config.dev.ts`

All you do now is run `npm run dev`.
From here you can simply load the unpacked file on your browser extension page and get to work.

# Building Production App

The build of the production application depends on:

- The production manifest file at `public/manifest.json`
- The Vite config file for production at `vite.config.ts`

Before you build your application make sure the app version number in `public/manifest.json` is the latest version and follows the previous latest version. Once you update that, you can proceed.

From here you can run `npm run build:prod`, which will build the extension application into the `/dist` directory.

Now you can run `npm run package` which will build the required zip file (with the name of the file being the app version that was built).

Upload the `<version_number>.zip` file to the Chrome Extension App Store.
