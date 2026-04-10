# Expected Service Worker Behaviour

- If local storage is cleared during operation, all the state (`block`, `spot`, `connection`, `preferences`) should be able to recover. Everything except `preferences` naturally recovers due to the lifecycle design - this means <u>I need to ensure only that preferences can be stored (even if its just the default)</u>
  - If the cache is cleared, the popup will already have some React state records of the user's preferences, we should use this to initiate a storage write. To manage this, we should maybe <b>check if the `preferences` key exists in storage</b>. If it doesn't then we simply make the popup

### In Development (loading unpacked):

- Reload on extensions page will cause `onInstall` to run alone on start.
- Opening browser (if already installed extension) will cause `onStartup` to run alone on start.
