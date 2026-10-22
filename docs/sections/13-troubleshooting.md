## Troubleshooting

### Nothing mounts and the console warns about an unknown integration

The `data-pharaonic` name was never registered. Check the spelling, and that your integration script is on the page. Registration may happen before or after the runtime loads; see [Load Order](#load-order).

### `livewire-unsupported` is reported

The page runs a Livewire major this line does not support. The 3.x line supports Livewire 3 only; use the 1.x line for Livewire 1 and the 2.x line for Livewire 2.

### The runtime script returns 404

The web server answers `.js` URLs from `public/` without asking Laravel. Let `/pharaonic/livewire-assistant/assistant.js` fall through to `index.php`, as Livewire's own `/livewire/livewire.js` must.

### Composer refuses to install Laravel

Composer blocks releases with security advisories when it installs or updates them, and no Laravel 10 or 11 release is free of them. See the warning in [Installation](#installation).

### Composer refuses Livewire below 3.8.3

The 3.x line requires Livewire 3.8.3 or later, the first Livewire 3 release with no known advisory. Update Livewire within its major: `composer update livewire/livewire`.

### Typing in an input jumps back to older text

The integration applies every value `watch()` reports, including values from requests the user has already typed past. Leave the focused input alone, as in [Basic Usage](#basic-usage).

### `livewire-missing` is reported

Livewire's scripts were not on the page. Add `@livewireScripts` to the layout.

### `component-not-found` with a component id

No component has the id in `data-component-id`. The element is not bound to any other component; fix the id, or remove the attribute to use the nearest component.

### The widget disappears or duplicates after a request

The widget markup is not inside `wire:ignore`, so Livewire's morphing removes it. Wrap the element in `wire:ignore`.

### Toggling one widget removes a different one

Livewire compared the wrong ignored blocks. Give every ignored block that can appear or disappear a unique `wire:key`, and do not use an inner element's `id` as the key. See [Targeting and the DOM](#targeting).

### The widget does not follow server changes

Elements inside `wire:ignore` never receive new server HTML. Subscribe with `component.watch(property, callback)` and apply the value in the callback.

### Writes bounce back and forth

The integration applies server values in a way that fires its own change handler. Compare values before applying them, and refresh the widget without triggering your handler, as in the [Select2 walkthrough](#select2).

### A deferred `set()` never resolves

`set(..., { live: false })` resolves with the component's next request. If nothing sends one, call an action, for example `component.call('$refresh')`, or write with `{ live: true }`.

### `registration-conflict` after a `wire:navigate` visit

`wire:navigate` ran your integration script again, and it registered a new definition object under the same name. Add `data-navigate-once` to the script tag, or load it in `<head>`. See [Navigation](#targeting).

### Coming from pharaonic/livewire-select2

`pharaonic/livewire-select2` ships its own Select2 initialization script. On Livewire 3, use this package with the [Select2 integration](#select2) instead; keep jQuery and Select2:

| livewire-select2 | Livewire Assistant |
| --- | --- |
| `wire:model` on the select | `data-property`; the integration writes with `set()` |
| `wire:model.defer` on the select | `data-property`, and `set(property, value, { live: false })` in the integration |
| `data-component-id`, required | `data-component-id`, optional |
| `data-placeholder`, `data-dir`, `data-language`, `data-tags`, `data-clear` … | Select2 settings in `data-options` |
| `pharaonic.select2.init` and `pharaonic.select2.load` browser events | `Pharaonic.assistant.scan(element)` |
| Widget changes sent to Livewire, one way | Two-way sync, including clearing and server changes |
