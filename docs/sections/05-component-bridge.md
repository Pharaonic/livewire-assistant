## Component Bridge

`context.component` is the only way an integration talks to Livewire. Where Livewire 1 cannot provide something, the bridge says so with an error instead of pretending.

| Member | Returns |
| --- | --- |
| `id` | The component id (string). |
| `get(path)` | A copy of the current client-side value, or `undefined`. Synchronous. |
| `set(path, value, { live = true } = {})` | `Promise<undefined>` |
| `call(method, ...args)` | `Promise<undefined>` on Livewire 1 |
| `watch(path, callback)` | An unsubscribe function. |

### Property paths

`get`, `set`, and `watch` take a property name or a dot path: `country_id`, `address.city`, `items.0.name`. The first segment must be a valid identifier and no segment may be empty. An invalid path, including `null` from an element without `data-property`, throws (`get`, `watch`) or rejects (`set`) with `invalid-property`. The bridge never guesses a property name.

### get(path)

Returns the component state the browser has right now. It is not a server request. The value is a copy, so changing it does not change the component.

```js
component.get('address.city') // "Cairo"
component.get('address.zip')  // undefined
component.get('country_id')   // 0 (never coerced)
```

### set(path, value, { live })

Sends the value to the component property in a Livewire request. The promise resolves after the request that carried this write has finished and the page was updated, and rejects with `request-failed` if that request failed.

On Livewire 1:

- every write is live; Livewire 1 has no deferred updates;
- `{ live: false }` rejects with `unsupported-operation`;
- `get()` returns the new value only after the round trip, because Livewire 1 does not change client state before the server answers.

Values are sent as they are: `0`, `''`, `null`, `false`, and arrays all reach the server unchanged.

### call(method, ...args)

Calls a public component method. The promise resolves after the request has finished and rejects with `request-failed` if it failed. Livewire 1 actions return nothing to the browser, so the promise resolves to `undefined`.

```js
await component.call('save', 'draft')
```

### watch(path, callback)

Calls `callback(value, previousValue)` each time a Livewire update changes the value at `path`, whether the change was made on the server or came from the browser. Values are compared as JSON, so a re-render with an equal value does not call it. The callback does not fire immediately; read the initial value with `get()`.

```js
const unwatch = component.watch('country_id', (value, previous) => {
    // ...
})

unwatch() // idempotent
```

Watchers end with their instance; you only need `unwatch` to stop earlier. A throwing callback is reported as `watcher-failed` and does not affect other watchers.

:::warning The bridge is not authorization
Targeting a component from the browser grants nothing. Livewire actions and properties keep their normal server-side validation and authorization; treat every value they receive as user input.
:::
