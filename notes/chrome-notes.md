# Chrome Observations and Research

`runtime.onInstalled` is not only for first install. It also fires when:

- The extension is updated (this is obvious)
- Chrome itself is updated (this is less obvious - but is it factor to opening your browser every time?)

For <b>unpacked extensions</b>, <u>a reload is treated as an update</u> and will fire `onInstalled` with reason `"update"` (this explains some unintended testing effects when doing this during development testing). `runtime.onStartup` is separate and fires when the profile starts up.

If you see both logs (`onInstalled`, `onStartup`) on launch, the likely explanations are:

- Chrome/profile startup triggered `onStartup` (not sure this is the reason for things)
- `onInstalled` also fired because Chrome had updated, or your unpacked extension got treated as an update/reload in development.

> How to prevent both lifecycle events from firing (`onInstalled`, `onStartup`): <b>Make bootstrap idempotent in-process</b>

To achieve this, <.u>use a shared promise guard</u>.
