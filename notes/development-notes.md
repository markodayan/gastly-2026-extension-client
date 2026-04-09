# Development notes

### Why use `void` here?

```typescript
void runBootstrapOnce();
```

Without void here, we would be returning a promise we are not awaiting. Using void here means:

- I am intentionally starting this promise and not awaiting its result here.
- I am discarding the returned value on purpose

It is mainly a signal to TypeScript, linters and future developers working, on why we aren't using await here despite the function actually returning a promise (fire and forget intentionally)
Do note that `void` does <b>not</b> catch errors. It only discards the returned promise value. So if the promise rejects and the async function does not handle its own errors, you can still get unhandled promise rejections. In my code here, most of the async work is already wrapped internally with `try/catch` so that is okay.

### An alarm for checking websockets connection is probably unnecessary

We already have two signals:

1. websocket lifecycle itself
2. periodic `/spot` fetch

If the internet drops, eventually one or both will fail and you'll update state.

If the websocket dies in a weird way, `onclose` should normally fire, and if it does not reconnect, the spot fetch path can re-trigger `connectBlockWs()`

### connection state meanings

- `backendReachable` = HTTP success/failure updates
- `wsConnected` = websocket open/close updates

for `wsConnected`, we will let the websocket lifecycle own it:

- `onopen` -> `wsConnected: true`
- `onclose` -> `wsConnected: false`
  > Do not infer websocket state from HTTP failures

### Failed `fetch` meanings

It can mean different things:

- no internet
- DNS issue
- backend down
- CORS or permissions issue
- request aborted
- other transient failure

A non-OK response means something else again:

- backend reachable, but route returned error

### Failures in try/catch involving network requests

A catch for `fetch` means the request failed before getting a valid response, and usually implies:

- no internet
- DNS failure
- connection refused
- CORS/network layer failure

It does <b>NOT</b> mean:

- backend returned 500
- backend returned 404
- backend is reacahble but unhealthy

### Distinguishing failure types

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

### Multi-signal system

- HTTP success/failure -> backend reachability
- WS open/close -> streaming health
- timestamps -> freshness

> This is <b>exactly how real production systems model connectivity</b>

### Why duplicate block number check is okay to leave in within `handleWsMessage`

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

### Adding `updatedAt` to normalised block and spot payloads

This could be useful for:

- popup freshness uI
- debugging
- stale-data decisions

> I still feel like i could just access this through lastSpotFetchAt and lastBlockAt which is in the connection state variable. Therefore will not add an `updatedAt` to normalised block and spots shape.

- `block` = only fields the popup actually uses (domain data)
- `spots` = only fields the popup actually uses (domain data)
- `connection` = extension/runtime metadata

### Decision to centralise formatting policy on the server

A decision I have made because:

- the popup and badge stay consistent
- client logic stays simpler
- precision policy lives in one place (the server)

### Architecture Context

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
