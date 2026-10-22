# Changelog

All notable changes to this project are documented here.

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
