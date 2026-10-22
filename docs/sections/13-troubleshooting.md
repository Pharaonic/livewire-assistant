## Troubleshooting

### Nothing mounts and the console warns about an unknown integration

The `data-pharaonic` name was never registered. Check the spelling, and that your integration script is on the page. Registration may happen before or after the runtime loads; see [Load Order](#load-order).

### `livewire-unsupported` is reported

The page runs a Livewire major this line does not support. The 1.x line supports Livewire 1 only. Note that the `livewire/livewire` 1.3.7 release contains Livewire 2 code; this package excludes it.

### The runtime script returns 404

The web server answers `.js` URLs from `public/` without asking Laravel. Let `/pharaonic/livewire-assistant/assistant.js` fall through to `index.php`, as Livewire's own `/livewire/livewire.js` must.

### Composer refuses to install Livewire 1

Composer blocks releases with security advisories, and every Livewire 1 release has one. See the warning in [Installation](#installation).

### `livewire-missing` is reported

Livewire's scripts were not on the page. Add `@livewireScripts` to the layout.

### `component-not-found` with a component id

No component has the id in `data-component-id`. The element is not bound to any other component; fix the id, or remove the attribute to use the nearest component.

### The widget disappears or duplicates after a request

The widget markup is not inside `wire:ignore`, so Livewire's morphing removes it. Wrap the element in `wire:ignore`.

### Toggling one widget removes a different one

Livewire 1 compared the wrong ignored blocks. Give every ignored block that can appear or disappear a unique `wire:key`, and do not use an inner element's `id` as the key. See [Targeting and the DOM](#targeting).

### The widget does not follow server changes

Elements inside `wire:ignore` never receive new server HTML. Subscribe with `component.watch(property, callback)` and apply the value in the callback.

### Writes bounce back and forth

The integration applies server values in a way that fires its own change handler. Compare values before applying them, and refresh the widget without triggering your handler, as in the [Select2 walkthrough](#select2).

### `set(..., { live: false })` rejects with `unsupported-operation`

Livewire 1 has no deferred updates. Omit the option; every write is sent immediately.

### `call()` resolves to `undefined`

Livewire 1 actions return no value to the browser. Read the new state with `get()` after the promise resolves.

### Migrating from pharaonic/livewire-select2

`pharaonic/livewire-select2` requires Livewire 2 and bundles its own Select2 loader. On Livewire 1, use this package with the [Select2 integration](#select2) instead:

| livewire-select2 | Livewire Assistant |
| --- | --- |
| `wire:model` or `wire:model.defer` on the select | `data-property` |
| `data-component-id` | `data-component-id` (now optional) |
| `data-placeholder`, `data-dir`, `data-language` … | Select2 settings in `data-options` |
| `pharaonic.select2.load` browser event | `Pharaonic.assistant.scan(element)` |
| Only `select2:select` synced, one way | Two-way sync, including clearing and server changes |
