## Troubleshooting

### Nothing mounts and the console warns about an unknown integration

The `data-pharaonic` name was never registered. Check the spelling, and that your integration script is on the page. Registration may happen before or after the runtime loads; see [Load Order](#load-order).

### `livewire-unsupported` is reported

The page runs a Livewire major this line does not support. The 1.x line supports Livewire 1 only. Note that the `livewire/livewire` 1.3.7 release contains Livewire 2 code; this package excludes it.

### The runtime script returns 404

The web server answers `.js` URLs from `public/` without asking Laravel. Let `/pharaonic/livewire-assistant/assistant.js` fall through to `index.php`, as Livewire's own `/livewire/livewire.js` must.

### Composer refuses to install Livewire 1 or Laravel

Composer blocks releases with security advisories when it installs or updates them, and no Livewire 1, Laravel 7, or Laravel 8 release is free of them. See the warning in [Installation](#installation) for the packages to allow.

### Typing in an input jumps back to older text

The integration applies every value `watch()` reports, including values from requests the user has already typed past. Leave the focused input alone, as in [Basic Usage](#basic-usage).

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

### Coming from pharaonic/livewire-select2

`pharaonic/livewire-select2` requires Livewire 2 and ships its own Select2 initialization script. On Livewire 1, use this package with the [Select2 integration](#select2) instead:

| livewire-select2 | Livewire Assistant |
| --- | --- |
| `wire:model` or `wire:model.defer` on the select | `data-property` |
| `data-component-id`, required | `data-component-id`, optional |
| `data-placeholder`, `data-dir`, `data-language`, `data-tags`, `data-clear` … | Select2 settings in `data-options` |
| `pharaonic.select2.init` and `pharaonic.select2.load` browser events | `Pharaonic.assistant.scan(element)` |
| Widget changes sent to Livewire, one way | Two-way sync, including clearing and server changes |
