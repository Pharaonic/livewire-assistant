## Troubleshooting

### Nothing mounts and the console warns about an unknown integration

The `data-pharaonic` name was never registered. Check the spelling, and that your integration script is on the page. Registration may happen before or after the runtime loads; see [Load Order](#load-order).

### `livewire-unsupported` is reported

The page runs a Livewire major this line does not support. The 2.x line supports Livewire 2 only; use the 1.x line for Livewire 1.

### The runtime script returns 404

The web server answers `.js` URLs from `public/` without asking Laravel. Let `/pharaonic/livewire-assistant/assistant.js` fall through to `index.php`, as Livewire's own `/livewire/livewire.js` must.

### Composer refuses to install Laravel

Composer blocks releases with security advisories when it installs or updates them, and no Laravel 7, 8, 9, or 10 release is free of them. See the warning in [Installation](#installation) for the packages to allow on each Laravel version.

### Composer refuses Livewire below 2.12.7

The 2.x line requires Livewire 2.12.7 or later, the first Livewire 2 release with the fix for CVE-2024-47823. Update Livewire within its major: `composer update livewire/livewire`.

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

### Navigating with Turbolinks or Turbo leaves widgets broken

Livewire 2 needs Livewire's `livewire-turbolinks` adapter after `@livewireScripts`. Without it, Livewire does not restart on visits, and the Assistant has no components to bind to.

### Coming from pharaonic/livewire-select2

`pharaonic/livewire-select2` ships its own Select2 initialization script. To replace it on Livewire 2, remove that package and its script, keep jQuery and Select2, and use this package with the [Select2 integration](#select2):

| livewire-select2 | Livewire Assistant |
| --- | --- |
| `wire:model` on the select | `data-property`; the integration writes with `set()` |
| `wire:model.defer` on the select | `data-property`, and `set(property, value, { live: false })` in the integration |
| `data-component-id`, required | `data-component-id`, optional |
| `data-placeholder`, `data-dir`, `data-language`, `data-tags`, `data-clear` … | Select2 settings in `data-options` |
| `pharaonic.select2.init` and `pharaonic.select2.load` browser events | `Pharaonic.assistant.scan(element)` |
| Widget changes sent to Livewire, one way | Two-way sync, including clearing and server changes |
