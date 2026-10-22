## Writing Integrations

An integration is a plain object registered under a name. The Assistant calls it; it never calls the Assistant's internals.

### register(name, definition)

```js
const unregister = Pharaonic.assistant.register('example', {
    mount(context) {
        // Create the widget and attach listeners.
        return () => {
            // Destroy the widget and remove those listeners.
        }
    },
    update(context) {
        // Optional: refresh the existing widget after its element changed.
    },
})
```

- `name` starts with a letter or digit and continues with letters, digits, `.`, `:`, `_` or `-`; surrounding whitespace is trimmed. Anything else throws `invalid-registration`.
- `definition.mount` is required; `definition.update` is optional. Anything else throws `invalid-registration`.
- Registering the same definition object under the same name again is harmless and returns the same `unregister`.
- A different definition under a taken name throws `registration-conflict` and leaves the live instances alone.
- Registering after startup mounts every matching element on the page right away.
- `unregister()` destroys that registration's instances and frees the name. Calling it again does nothing.

### mount(context)

`mount` runs once per element, synchronously, when the element, its integration, and its component are all available. It returns a cleanup function or `undefined`.

| Outcome | What happens |
| --- | --- |
| Returns a function or `undefined` | The instance is kept. |
| Throws | Cleanups already registered with `onCleanup` run, `mount-failed` is reported, and the element is not retried until its binding changes or you `destroy()` it. |
| Returns a promise | Treated as a failure (`mount-async`); cleanups registered with `onCleanup` run. Whatever the promise does later is up to the integration. |
| Returns anything else | `mount-failed`. |

A failure in one integration never stops other elements or integrations from mounting.

### update(context)

When Livewire changes a mounted element, or anything inside it, and the binding is unchanged, the Assistant calls `update` once for that change, with the same context as `mount`. Several notifications from one Livewire update are coalesced into one call. Errors are reported as `update-failed` and the instance is kept.

Elements inside `wire:ignore` are not changed by Livewire, so `update` never runs for them. Use `watch()` for server-side changes instead; see [Targeting and the DOM](#targeting).

### When an instance is remounted

The binding of an element is its integration name, `data-property`, `data-component-id`, parsed `data-options`, and the component it resolves to. If any of these changes, the old instance is destroyed and a new one is mounted. `update` is not called.

Options are compared as JSON values, so whitespace and key order do not count: `{"a":1,"b":2}` and `{ "b": 2, "a": 1 }` are the same binding.

### Cleanup

The cleanup returned by `mount`, every `onCleanup` callback, and every watcher are disposed exactly once, last in, first out. A throwing disposer is reported as `cleanup-failed`, and the others still run.

Instances are cleaned up when:

- their element leaves the page (checked right after each Livewire update);
- their component is removed or replaced;
- their binding changes;
- you call `destroy()` on the element or an ancestor;
- their integration is unregistered;
- Turbolinks is about to cache the page.

An element that only moves inside its component keeps its instance.

### The context

```js
{
    element,      // the HTMLElement
    property,     // data-property, or null
    options,      // the parsed data-options object, {} when absent
    component,    // the component bridge, see Component Bridge
    onCleanup(callback),
}
```

The context and the bridge are frozen. `onCleanup(callback)` adds a disposer owned by this instance; after the instance is gone it runs the callback immediately. Old contexts never act on a component that was destroyed or replaced: their bridge throws (`get`, `watch`) or rejects (`set`, `call`) with `stale-context`.
