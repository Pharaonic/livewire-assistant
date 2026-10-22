## Compatibility

Every combination below installs with Composer and passes PHPStan and the PHP suite with lowest and highest dependencies. The real-browser suite (real Livewire 4 components driven in real browsers) runs on the lowest PHP of each Laravel version, with lowest and highest dependencies. CI also runs the browser suite in WebKit.

| Line | Livewire | Laravel | PHP | Browsers |
| --- | --- | --- | --- | --- |
| 4.x | 4.3.4+ | 10.16+ | 8.1, 8.2, 8.3 | Chromium, Firefox |
| 4.x | 4.3.4+ | 11 | 8.2, 8.3, 8.4 | Chromium, Firefox |
| 4.x | 4.3.4+ | 12 | 8.2, 8.3, 8.4, 8.5 | Chromium, Firefox |
| 4.x | 4.3.4+ | 13 | 8.3, 8.4, 8.5 | Chromium, Firefox |

Tested boundaries: Laravel 10.16.0, 11.44.2, 12.0.1, and 13.0.0 with Livewire 4.3.4 (lowest), and Laravel 10.50.3, 11.57.0, 12.70.1, and 13.38.0 with Livewire 4.4.8 (highest). Livewire 4.3.4 and this package allow Laravel 11.0, but Pest 3.8 and Testbench 9 need 11.44.2, so that is the oldest Laravel 11 release the suite runs on. Laravel 10 starts at 10.16, because Livewire 4.3.4 registers its Blade precompiler with `prepareStringsForCompilationUsing()`, which earlier Laravel 10 releases do not have.

The 1.x line supports Livewire 1, the 2.x line Livewire 2, and the 3.x line Livewire 3; each has its own version of these docs.

### Why Livewire 4.3.4

Livewire 4.3.3 and earlier are affected by CVE-2026-81887 (DOM-based cross-site scripting during client-side state handling). Requiring 4.3.4 keeps every known Livewire advisory out of applications that install this line, and every Livewire 4 application can update to it within its major.

### How it uses Livewire 4

- The runtime owns registration, discovery, ownership, the lifecycle, the bridge contract, and diagnostics.
- It follows Livewire 4 through its documented hooks (`component.init`, `element.init`, `morph.added`, `morph.updating`, `morph.updated`, `morph.removed`), message interceptors (`Livewire.interceptMessage`), component cleanups, and the `livewire:initialized`, `livewire:navigating`, and `livewire:navigated` events.
- Livewire 4 reports every element its morph visits, so an element counts as changed, and gets `update()`, only when it differs from the new server HTML.
- `set()` uses `$wire.$set()` and `call()` uses `$wire.$call()`, so `call()` resolves with the method's return value. Livewire 4 rejects those promises when the action fails validation, although the request succeeded and the page shows the errors; the bridge resolves them instead, as on earlier lines, and rejects with `request-failed` only when the request failed or was cancelled.
- `set()` hands Livewire a copy of the value, so later server updates never change an object or array your integration still holds.

Livewire 4 has no public API for two things the bridge needs, so the runtime reads these internals and nothing else: the component objects behind `Livewire.all()` and their client state, for `get()`, and the "initial render finished" flag, to detect an already started Livewire.

:::warning Unmaintained Laravel versions
Laravel 10 and 11 no longer receive security fixes. This line supports them because Livewire 4 does, but your application still carries their advisories. Plan your upgrade to Laravel 12 or 13.
:::
