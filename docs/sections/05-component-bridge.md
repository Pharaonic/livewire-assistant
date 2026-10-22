## Component Bridge

`context.component` is the only way an integration talks to Livewire.

| Member | Returns |
| --- | --- |
| `id` | The component id (string). |
| `get(path)` | A copy of the current client-side value, or `undefined`. Synchronous. |
| `set(path, value, { live = true } = {})` | `Promise<undefined>` |
| `call(method, ...args)` | `Promise` of the method's return value |
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

Writes the value to the component property. The promise resolves after the request that carried this write has finished and the page was updated, and rejects with `request-failed` if that request failed.

- `{ live: true }`, the default, sends the write right away, like `wire:model`. `get()` returns the new value once the round trip finished.
- `{ live: false }` defers the write, like `wire:model` without `.live`: Livewire sends it with the component's next request, and the promise resolves when that request finishes. Until then, `get(path)` with the same path already returns the deferred value.

Values are sent as they are: `0`, `''`, `null`, `false`, and arrays all reach the server unchanged.

### call(method, ...args)

Calls a public component method. The promise resolves with the method's return value after the request has finished, and rejects with `request-failed` if it failed. A method that returns nothing, or `null`, resolves to `undefined`.

```js
const total = await component.call('total', 'EUR') // 42.5
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
