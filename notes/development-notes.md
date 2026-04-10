# Principles

❌ The React app should not manage business logic, talk to WebSocket, fetch API directly.

The React app should:

- Treat `chrome.storage` as a <b>reactive store</b> ✅
- subscribe to updates
- render derived state

> React popup = view layer over storage

# Repair Strategies

Preference management involves a <b>clean bidirectional resilience model</b> without making React and storage fight each other.

## 1. Cold-open repair

When popup opens and storage is already damaged (damage occured while popup was closed).

## 2. Live-session repair

When popup is open and storage gets damaged.

<br />

If `preferences` or `preference.<whatever_key>` is flushed:

```markdown
# scenario example

preferences is not in storage

# scenario example

preferences.<whatever_key> is not in storage
```

We want to compare this to the expected preferences shape and take action:

- <u>Popup Open when flush happened (scenario)</u>:
  - <b>if `preferences` is not found at all in storage</b> -> find React `preference` state; if found, write to storage, if not found, write entire DEFAULT_PREFERENCES to storage.
  - <b>if a preference key is missing in storage</b> -> try to find that key in React `preference` state; if found, write to storage, if not found, just write the default preference to storage.
- <u>Popup was closed when flush happened and now want to resolve when popup gets opened (scenario)</u>:
  - <b>if `preferences` is not found at all in storage</b> -> simply write default preferences to storage and sync that to React state.
  - <b>if a preference key is missing in storage</b> -> merge the default for that key with the storage preference snapshot and write to storage as well as sync the merged payload to React state.

<br />

## <u>Dealing with <b>Cold-Open Repair</b></u>:

- use `ensurePreferencePersisted()`

## <u>Dealing with <b>Live-Session Repair</b></u>:

- compare storage changes against expected preference shape
- repair from current React preferences where possible
- otherwise fall back to defaults

## Test Cases for preferences repair

For example, if storage contains:

```typescript
{
  fiatPreference: 'ethzar';
}
```

and React current holds:

```typescript
{
  gasPreference: 'fast',
  fiatPreference: 'ethusd',
  transactionPreference: 'eth-send'
}
```

You need to decide which source wins for overlapping keys.
<u>The rule</u>:

- if a storage key still exists -> trust storage for that key
- if missing from storage -> use React
- if missing from both -> use default

> This makes the repair align with the <b>latest durable state</b>, while filling gaps from live state.

<br />

<u>Healing strategy for Race Condition: <b>Browser Storage Flush</b></u>:

- `block` = healed by service worker naturally
- `spots` = healed by service worker naturally
- `connection` = healed by service worker naturally
- `preferences` = healed by popup in storage hook mount effect

The <b>Service Worker</b> is responsible for <u>storage integrity</u>. It should:

- ensure `preferences` exists in storage with defaults if missing
- not care about how those preferences affect UI presentation
- not derive display-specific values from them
  > So the worker's role is to make sure persisted preference object exists and is well-formed enough to be read

The <b>Popup</b> is responsible for <u>interpreting preferences</u>. It should:

- read preferences from storage
- merge with defaults defensively when building popup state
- use preferences to drive display logic
- optional heal storage if the popup detects preferences are missing or partial.

Expected popup preference management:
When it loads state:

1. Read storage snapshot
2. merge defaults with missing/partial preferences
3. <b>detect whether repair is neded</b>
4. if needed, <b>write repaired preferences back to storage</b>
5. use repaired preferences for local React state immediately.

This function is defined in `/src/shared/storage.ts`. It will look for `preferences` in storage and do a healing merge with preference defaults if any (or more) preference options are missing. If preferences is completely missing or any of the preference items are missing -> we do a storage write with the computed merged object:

```typescript
export async function ensurePreferencePersisted(): Promise<Preferences> {
  const result = (await chrome.storage.local.get('preferences')) as StorageShape;

  const repaired: Preferences = {
    ...DEFAULT_PREFERENCES,
    ...(result.preferences ?? {}),
  };

  const needsRepair =
    !result.preferences ||
    result.preferences.gasPreference === undefined ||
    result.preferences.fiatPreference === undefined ||
    result.preferences.transactionPreference === undefined;

  if (needsRepair) {
    await chrome.storage.local.set({
      preferences: repaired,
    });
  }

  return repaired;
}
```

We can use `ensurePreferencePersisted()` in a popup hook. Calling it will restore preferences. We will combine this with the storage snapshot achieved via `getStorageSnapshot()`, to update the React application state with `{...snapshot, preferences}`.

# Some Q/A

## Why use `void` here?

```typescript
void runBootstrapOnce();
```

Without void here, we would be returning a promise we are not awaiting. Using void here means:

- I am intentionally starting this promise and not awaiting its result here.
- I am discarding the returned value on purpose

It is mainly a signal to TypeScript, linters and future developers working, on why we aren't using await here despite the function actually returning a promise (fire and forget intentionally)
Do note that `void` does <b>not</b> catch errors. It only discards the returned promise value. So if the promise rejects and the async function does not handle its own errors, you can still get unhandled promise rejections. In my code here, most of the async work is already wrapped internally with `try/catch` so that is okay.

## An alarm for checking websockets connection is probably unnecessary

We already have two signals:

1. websocket lifecycle itself
2. periodic `/spot` fetch

If the internet drops, eventually one or both will fail and you'll update state.

If the websocket dies in a weird way, `onclose` should normally fire, and if it does not reconnect, the spot fetch path can re-trigger `connectBlockWs()`

## connection state meanings

- `backendReachable` = HTTP success/failure updates
- `wsConnected` = websocket open/close updates

for `wsConnected`, we will let the websocket lifecycle own it:

- `onopen` -> `wsConnected: true`
- `onclose` -> `wsConnected: false`
  > Do not infer websocket state from HTTP failures

## Failed `fetch` meanings

It can mean different things:

- no internet
- DNS issue
- backend down
- CORS or permissions issue
- request aborted
- other transient failure

A non-OK response means something else again:

- backend reachable, but route returned error

## Failures in try/catch involving network requests

A catch for `fetch` means the request failed before getting a valid response, and usually implies:

- no internet
- DNS failure
- connection refused
- CORS/network layer failure

It does <b>NOT</b> mean:

- backend returned 500
- backend returned 404
- backend is reacahble but unhealthy

## Distinguishing failure types

<u><b>Transport-level failure </b></u>(no response at all)

```typescript
catch (error) {
  if (error instanceof TypeError) {
    // likely network failure
  }
}
```

<u><b>Application-level failure </b></u>(HTTP response exists but not OK)

```typescript
if (!res.ok) {
  throw new Error(`HTTP /block ${res.status}`);
}
```

Goal is to distinguish whether `backendReachable` is true based on what happens:

- HTTP 200 -> `backendReachable = true`
- HTTP 500 -> `backendReachable = true`
- HTTP 404 -> `backendReachable = true`
- network failure -> `backendReachable = false`

## Multi-signal system

- HTTP success/failure -> backend reachability
- WS open/close -> streaming health
- timestamps -> freshness

> This is <b>exactly how real production systems model connectivity</b>

## Why duplicate block number check is okay to leave in within `handleWsMessage`

```typescript
const currentBlock = await getBlock();

if (currentBlock?.number === nextBlock.number) {
  return;
}
```

Even if your server is intended to be strictly new-head drivem duplicate messages are not impossible:

- reconnect edge cases
- replayed last message
- legacy server behavior
- future pipeline quirks

## Adding `updatedAt` to normalised block and spot payloads

This could be useful for:

- popup freshness uI
- debugging
- stale-data decisions

> I still feel like i could just access this through lastSpotFetchAt and lastBlockAt which is in the connection state variable. Therefore will not add an `updatedAt` to normalised block and spots shape.

- `block` = only fields the popup actually uses (domain data)
- `spots` = only fields the popup actually uses (domain data)
- `connection` = extension/runtime metadata

## Decision to centralise formatting policy on the server

A decision I have made because:

- the popup and badge stay consistent
- client logic stays simpler
- precision policy lives in one place (the server)

## Architecture Context

<b>Server</b>

- prepares block data
- prepares precision
- emits block WS payloads
- serves `/block` and `/spot`

<b>Service Worker</b>

- transports data
- normalises shape
- stores popup-facing data
- tracks extension connectivity/freshness metadata

<b>Popup</b>

- reads app-specific data
- reads runtime metadata
- derives UI state

## Why handling preference synchronisation with a useEffect having a state dependency might not be worth it

It can work and would probably be fine. But using refs instead is much better.

The downsides to doing this with a dependency are real:

- listeners attach/remove on every preference change ❌
- more moving pieces ❌
- slightly harder to reason about ❌
- the effect now does two jobs: ❌
  - register listener
  - <b>track latest preferences ❌</b> [THIS IS PROBABLY THE MOST PROFOUND DECISIVE FACTOR TO ME]

> We should rather use this Event to handle less things. Registering the listener is fine as a core responsibility, but introducing other dependencies that trigger its handler execution makes it less specific and therefore more complicated to manage. Keep things simple. Use refs in the listener and keep the running of the event that manages the listener itself separate. Think of the event as being used to manage infrastructure for React and the listener block being the true place where we can programmably interact with the service worker and storage.

## useRef vs useEffectEvent

In React, `useRef` and `useEffectEvent` are used within `useEffect` <u> to handle non-reactive logic -- code that needs the latest values but should not trigger the effect to re-run</u>.

### `useEffectEvent`

Introduced in React 19.2, this hook is the official way to separate 'event-like' logic from synchronisation logic.

- <u>Purpose</u>: Extacting logic that uses the latest props/state but shouldn't cause the effect to re-synchronise when those values change.
- <u>Reactivity</u>: The function returned by `useEffectEvent` is non-reactive. You can exclude it from the `useEffect` dependency array without triggering ESLint warnings.
- 💡 <b><u>Automatic Management</u>: React internally manages a ref to keep the callback fresh, eliminating manual boilerplate.</b>
- <u>Constraint</u>: These "Effect Events" can only be called from inside an effect and cannot be passed to other components (this is a good argument for using effect events because they are application-specific unlike refs)

React using refs to make `useEffectEvent` is quite revealing. This means both options are effectively the same thing under the hood. Its just that `useRef` will be more directly using refs compared to the effect event hook which abstracts ref management. <u>For this reason, I think using refs will probably be better for better overview of the lifecycle</u>.

The fact that Effect Events essentially are hooks designed to use refs specifically within events tells me that <b>this will become the React industry standard</b>. So I think because im working in React, I might as well use them. Refs already are an abstraction to make doing things in React easier so clinging onto library anxiety is already not a good argument to choose refs over effect events. In addition to this, refs can be used in multiple ways within a React app, so using them within an Effect, adds complexity to the codebase and understanding it.

### `useRef` (manual workaround)

Before `useEffectEvent`, developers used the <b>"Latest Ref Pattern"</b> to achieve the same result:

- <u>Mechanism</u>: You manually store a value or function in `ref.current` and update it on every render (often inside `useLayoutEffect`).
- <u>Usage</u>: Since `ref.current` changes do not trigger re-renders, the effect can access the latest value without including the ref in its dependency array.
- ❌ <u>Downside</u>: It requires more boilerplate and is more prone to <b>stale closure</b> bugs if the ref isn't updated correctly at the right time in the render cycle.

| Feature      | `useEffectEvent`                         | `useRef` (Latest Ref Pattern)                |
| ------------ | ---------------------------------------- | -------------------------------------------- |
| Status       | Offical API (React 19.2+)                | Manual pattern/Workaround                    |
| Boilerplate  | Low; handled by React                    | High; manual sync required                   |
| Dependencies | Automatically excluded                   | Manually excluded                            |
| Primary Use  | Reading latest state in Effects          | DOM access or persisting values              |
| Safety       | Safer; integrates with React's lifecycle | Prone to stale colsures if manual sync fails |
|              |

> Use `useEffectEvent` if you are on React 19.2+ and need to read current values inside an effect without re-triggering it.

> Use `useRef` only if you need to directly interact with DOM elements or maintain a stable reference across renders for non-effect logic.

# Future Improvement Directions

### Improving Connection Logic

We are running a state machine, but implicitly it is spread across:

- `fetchAndSyncLatestBlock`
- `fetchAndSyncSpotRates`
- WS handlers

But eventually, this can become hard to reason about.

A potential improvement could be to formalise into something like

```typescript
type ConnectionMode = 'ws' | 'http-fallback' | 'offline';
```

> Not too sure about this, but there are some parts of this idea that I feel could improve observability

### Change reconnect strategy from constant to dynamic (e.g. exponential backoff, jitter)

Right now we have

```typescript
const WS_RECONNECT_DELAY_MS = 3_000;
```

Eventually will want:

- expontential backoff
- jitter
