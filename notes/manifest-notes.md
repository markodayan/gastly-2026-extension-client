Host permissions might not be needed:

```json
"host_permissions": ["https://extension-api.gastly.tools/*"]
```

```
logo.svg
   ↓
[sharp]
   ↓
icon16.png   → toolbar + manifest
icon32.png   → toolbar + manifest
icon48.png   → manifest
icon128.png  → manifest (store + install)
```
