# Expected Service Worker Behaviour

- If local storage is cleared during operation, all the state (`block`, `spot`, `connection`, `preferences`) should be able to recover. Everything except `preferences` naturally recovers due to the lifecycle design - this means <u>I need to ensure only that preferences are always available (whether default, user-specified or merged with defaults if user-specified keys are missing)
  - Make popup reads always merge defaults
  - optionally persist repaired preferences immediately if missing

## User updating preference in popup

1. User changes a preference
2. React state updates immediately
3. Storage write happens
4. Storage listener fires
5. State stays in sync

## In Development (loading unpacked):

- Reload on extensions page will cause `onInstall` to run alone on start.
- Opening browser (if already installed extension) will cause `onStartup` to run alone on start.
  s
