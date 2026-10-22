## Diagnostics

Failures that happen during automatic work, such as mounting an element after a Livewire update, cannot be thrown to you. They are dispatched as a `pharaonic:assistant:error` event on `window` and written to the console with `console.error`, in development and in production.

```js title="resources/js/app.js"
window.addEventListener('pharaonic:assistant:error', (event) => {
    const { code, message, integration, componentId, element } = event.detail

    reportToYourErrorTracker(code, message)
})
```

| Key | Value |
| --- | --- |
| `code` | A stable code from the table below |
| `message` | A readable explanation |
| `integration` | The integration name, or `null` |
| `componentId` | The component id involved, or `null` |
| `element` | The element involved, or `null` |

Reports never contain property values or component state. When an error has a cause, such as the exception a `mount` threw, it is passed to `console.error` but not put in the event.

Calls you make yourself, such as `register()`, `component.get()`, or `component.set()`, throw or reject with an `Error` whose `code` property holds the same codes. `scan()` and `destroy()` never throw; what they find goes to the event.

### Error codes

| Code | Raised when | Channel |
| --- | --- | --- |
| `invalid-registration` | `register()` got an invalid name or definition | thrown |
| `registration-conflict` | `register()` got a different definition for a taken name | thrown |
| `invalid-property` | A property path is empty or invalid | thrown / rejected |
| `invalid-options` | `data-options` is not a JSON object | event |
| `component-not-found` | An explicit id matches no component, or an element has no component | event |
| `livewire-missing` | Livewire was not on the page when it finished loading | event |
| `livewire-unsupported` | A Livewire major this line does not support is on the page | event |
| `mount-failed` | `mount` threw or returned something other than a function or `undefined` | event |
| `mount-async` | `mount` returned a promise | event |
| `update-failed` | `update` threw | event |
| `cleanup-failed` | A cleanup callback threw | event |
| `watcher-failed` | A `watch` callback threw | event |
| `queue-callback-failed` | A queued registration callback threw, or the queue is not an array | event |
| `stale-context` | A bridge method was used after its instance or component was destroyed | thrown / rejected |
| `unsupported-operation` | The bridge cannot do this on the page's Livewire version; never raised on Livewire 4 | rejected |
| `request-failed` | The Livewire request that carried a `set()` or `call()` failed | rejected |

### Missing integrations

An element whose `data-pharaonic` name is never registered is not an error, because integrations may register late. The Assistant warns once per unknown name with `console.warn`, which can also happen for an integration that registers a moment later, and mounts the elements as soon as the name is registered.
