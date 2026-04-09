# Expected Service Worker Behaviour

### In Development (loading unpacked):

- Reload on extensions page will cause `onInstall` to run alone on start.
- Opening browser (if already installed extension) will cause `onStartup` to run alone on start.
