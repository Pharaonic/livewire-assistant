## Compatibility

Every combination below installs with Composer and passes PHPStan and the PHP suite with lowest and highest dependencies. The real-browser suite (real Livewire 2 components driven in real browsers) runs on the lowest PHP of each Laravel version, with lowest and highest dependencies. CI also runs the browser suite in WebKit.

| Line | Livewire | Laravel | PHP | Browsers |
| --- | --- | --- | --- | --- |
| 2.x | 2.12.7+ | 7.30+ | 8.0 | Chromium, Firefox |
| 2.x | 2.12.7+ | 8.75+ | 8.0, 8.1 | Chromium, Firefox |
| 2.x | 2.12.7+ | 9 | 8.0, 8.1, 8.2 | Chromium, Firefox |
| 2.x | 2.12.7+ | 10 | 8.1, 8.2, 8.3 | Chromium, Firefox |

Tested boundaries: Laravel 7.30.3, 8.75.0, 9.0.0, and 10.0.0 with Livewire 2.12.7 (lowest), and Laravel 7.30.7, 8.83.29, 9.52.22, and 10.50.3 with Livewire 2.12.8 (highest).

The 1.x line supports Livewire 1 on PHP 7.4; its documentation is the 1.x version of these docs.

### Why Livewire 2.12.7

CVE-2024-47823 (remote code execution through file uploads) affects every Livewire release before 2.12.7. Requiring 2.12.7 keeps it out of every application that installs this line, and every Livewire 2 application can update to it within its major.

### How it uses Livewire 2

- The runtime owns registration, discovery, ownership, the lifecycle, the bridge contract, and diagnostics.
- It follows Livewire 2 through its documented hooks (`component.initialized`, `element.initialized`, `element.updated`, `element.removed`, `message.sent`, `message.processed`, `message.failed`), component teardown callbacks, and Turbolinks and Turbo events.
- `set()` with `{ live: true }` and `call()` use Livewire's own `call()`, so they settle with the request that carried them, and `call()` resolves with the method's return value.

Livewire 2 has no public API for three things the bridge needs, so the runtime reads these internals and nothing else: the component store with its "initial render finished" flag, to find components and detect replaced ones and an already started Livewire; the component data and its waiting deferred writes, for `get()`; and the actions of each request, to settle a deferred `set()` with the request that carried it.

:::warning Unmaintained Laravel versions
Laravel 7, 8, 9, and 10 no longer receive security fixes. This line supports them because Livewire 2 does, but your application still carries their advisories. Plan your upgrade to a maintained Laravel version, which means Livewire 3 or later.
:::
