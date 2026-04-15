# Deployment Notes (For Chrome Store Extensions)

For Chrome, `dist/manifest.json` is what Chrome uses when you load the unpacked extension or upload the packaged build.
Chrome expects `manifest.json` at the root of the extension bundle, not inside `public/`.
