## API Reference

### Browser API

Available as `window.Pharaonic.assistant` and as named exports of `dist/livewire-assistant.esm.js`.

| Method | Description | Returns |
| --- | --- | --- |
| `register(name, definition)` | Registers an integration and mounts its elements when Livewire is ready. | An idempotent `unregister()` function |
| `start()` | Connects to Livewire and installs its hooks once. Called automatically when the runtime loads; calling it again does nothing. | `undefined` |
| `scan(root = document)` | Mounts every eligible element in `root`, including `root` itself. Does nothing until Livewire is ready. | `undefined` |
| `destroy(root = document)` | Cleans every instance in `root`, including `root` itself, up and forgets failed mounts there. | `undefined` |

`scan` and `destroy` accept an element, a document, or a document fragment.

### Integration definition

| Member | Signature | Required |
| --- | --- | --- |
| `mount` | `(context) => (() => void) \| undefined` | yes |
| `update` | `(context) => void` | no |

### Context

| Member | Type |
| --- | --- |
| `element` | `HTMLElement` |
| `property` | `string \| null` |
| `options` | `object` |
| `component` | Component bridge |
| `onCleanup(callback)` | Adds a disposer owned by the instance |

### Component bridge

| Member | Signature | Returns |
| --- | --- | --- |
| `id` | | `string` |
| `get` | `(path)` | A copy of the value, or `undefined` |
| `set` | `(path, value, { live = true } = {})` | `Promise<undefined>` |
| `call` | `(method, ...args)` | `Promise<undefined>` on Livewire 1 |
| `watch` | `(path, callback(value, previousValue))` | An idempotent unsubscribe function |

### Globals

| Name | Purpose |
| --- | --- |
| `window.Pharaonic.assistant` | The runtime |
| `window.PharaonicAssistantQueue` | Registration callbacks queued before the runtime loads |
| `pharaonic:assistant:error` | Error event dispatched on `window` |

### Laravel

| Name | Purpose |
| --- | --- |
| `@livewireAssistantScripts` / `@livewireAssistantScripts(['nonce' => $nonce])` | Renders the runtime script once per page |
| `pharaonic.livewire-assistant.script` | Route name of `GET /pharaonic/livewire-assistant/assistant.js` |
| `Pharaonic\Livewire\Assistant\AssistantServiceProvider` | Auto-discovered service provider |
