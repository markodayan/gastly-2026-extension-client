# Popup React Application

Think of the popup like this:

- <b>storage state</b> = durable shared app state
- <b>React state</b> = mirror of storage snapshot
- <b>derived values</b> = computed at render from snapshot
- <b>local component state</b> = only for ephemeral UI concerns

Recommended folder structure

```
src/popup/
  App.tsx
  main.tsx
  index.css

  components/
    Header.tsx
    Body.tsx
    Metric.tsx
    PriceCard.tsx
    SpotRate.tsx
    SelectField.tsx

  hooks/
    useExtensionState.ts

  selectors/
    popupSelectors.ts

  utils/
    format.ts
```

Structure explained:

- <b>components</b> = UI only
- <b>hooks</b> = storage subscription
- <b>selectors</b> = computed values
- <b>utils</b> = formatting

### Most important piece: a storage subscription hook

You want one hook that does all of this:

- gets initial snapshot using `getStorageSnapshot()`
- subscribes to `chrome.storage.onChanged()`
- updates onl the changed pieces of state
- exposes the full current snapshot
- maybe exposes a loading boolean initially

## Future Changes

- Maybe include a `constants` file, that maps all the `transactionPreferences` to an intrinsic gas total. This will be used for the calculation of fee estimates denominated in fiat.
