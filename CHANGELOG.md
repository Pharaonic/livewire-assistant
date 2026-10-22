# Changelog

All notable changes to this project are documented here.

## 3.0.0 - Unreleased

The first release of the 3.x line, for Livewire 3. The integration API, the component bridge, the attributes, and the error codes are the same as in 2.x.

### Added

- Livewire 3 support, through Livewire 3's documented hooks.
- `wire:navigate` support: instances are cleaned up before Livewire leaves a page and mounted again on the next one, including back and forward.
- A failed request rejects `set()` and `call()` with `request-failed`, although Livewire 3 itself never settles those promises.

### Changed

- The script tag carries `data-navigate-once="true"` instead of the Turbolinks and Turbo attributes, so `wire:navigate` loads the runtime once.

### Compatibility

- Livewire 3.8.3 or later, the first Livewire 3 release with no known advisory.
- Laravel 10.15+ on PHP 8.1 to 8.3, Laravel 11 on PHP 8.2 to 8.4, Laravel 12 on PHP 8.2 to 8.5, and Laravel 13 on PHP 8.3 to 8.5.
- Laravel 10 starts at 10.15: Livewire 3.8.3 calls `Stringable::isUrl()`, which earlier Laravel 10 releases lack, so every page with Livewire fails there.
- Livewire 1 and 2 stay on the 1.x and 2.x lines.
- Turbolinks and Turbo are not supported; Livewire 3 navigates with `wire:navigate`.

## 2.0.0 - 2026-10-22

The first release of the 2.x line, for Livewire 2. The integration API, the component bridge, the attributes, and the error codes are the same as in 1.x.

### Added

- Livewire 2 support, through Livewire 2's documented hooks.
- Deferred writes: `set(path, value, { live: false })` sends the value with the component's next request, like `wire:model.defer`, and resolves with that request. Until then, `get(path)` returns the deferred value.
- `call()` resolves with the method's return value.
- Turbo support next to Turbolinks, with Livewire's `livewire-turbolinks` adapter. The script tag also carries `data-turbo-eval="false"`.

### Compatibility

- Livewire 2.12.7 or later, the first Livewire 2 release with the fix for CVE-2024-47823.
- Laravel 7.30+ on PHP 8.0, Laravel 8.75+ on PHP 8.0 to 8.1, Laravel 9 on PHP 8.0 to 8.2, and Laravel 10 on PHP 8.1 to 8.3.
- Livewire 1 stays on the 1.x line.
- `unsupported-operation` is no longer raised: Livewire 2 performs every bridge operation.

## 1.0.0 - 2026-10-22

### Added

- Integration registry: `register(name, definition)` with an idempotent unregister, duplicate and conflict handling, and late registration.
- `data-pharaonic` discovery with `data-property`, `data-component-id`, and JSON `data-options`, including elements Livewire adds later, plus `scan(root)` and `destroy(root)`.
- Component resolution by explicit id or nearest owning component, never a parent of a nested component; unknown explicit ids are reported and mount when the component initializes.
- Component bridge with `get`, `set`, `call`, and `watch`, and instance-owned cleanup through `onCleanup`.
- Lifecycle: mount once, coalesced `update`, remount on binding changes, cleanup on removal, component replacement, unregister, and Turbolinks visits.
- `pharaonic:assistant:error` event with stable error codes.
- `window.PharaonicAssistantQueue` for registering before the runtime loads.
- `@livewireAssistantScripts` Blade directive with an optional CSP nonce, rendering the runtime once per page.
- `pharaonic.livewire-assistant.script` route serving the prebuilt runtime with content-hash cache busting.
- ES module build sharing one runtime with the browser build.

### Compatibility

- Livewire 1.3.0 to 1.3.9, except 1.3.7, which contains Livewire 2 code.
- Laravel 7.30+ and 8.75+.
- PHP 7.4, because every Livewire 1 release requires PHP 7.
- On Livewire 1, `set(..., { live: false })` rejects with `unsupported-operation`, and `call()` resolves to `undefined`.
- Livewire 1, Laravel 7, and Laravel 8 no longer receive security fixes. Recent Composer versions refuse to install or update them until their advisories are allowed; the installation guide lists the packages.
