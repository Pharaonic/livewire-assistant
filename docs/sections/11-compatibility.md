## Compatibility

Every combination below installs with Composer and passes PHPStan and the PHP suite with lowest and highest dependencies. The real-browser suite (real Livewire 3 components driven in real browsers) runs on the lowest PHP of each Laravel version, with lowest and highest dependencies. CI also runs the browser suite in WebKit.

| Line | Livewire | Laravel | PHP | Browsers |
| --- | --- | --- | --- | --- |
| 3.x | 3.8.3+ | 10.15+ | 8.1, 8.2, 8.3 | Chromium, Firefox |
| 3.x | 3.8.3+ | 11 | 8.2, 8.3, 8.4 | Chromium, Firefox |
| 3.x | 3.8.3+ | 12 | 8.2, 8.3, 8.4, 8.5 | Chromium, Firefox |
| 3.x | 3.8.3+ | 13 | 8.3, 8.4, 8.5 | Chromium, Firefox |

Tested boundaries: Laravel 10.15.0, 11.44.2, 12.0.1, and 13.0.0 with Livewire 3.8.3 (lowest), and Laravel 10.50.3, 11.57.0, 12.70.1, and 13.38.0 with Livewire 3.8.11 (highest). Livewire 3.8.3 and this package allow Laravel 11.0, but Pest 3.8 and Testbench 9 need 11.44.2, so that is the oldest Laravel 11 release the suite runs on. Laravel 10 starts at 10.15, because Livewire 3.8.3 renders its scripts with `Stringable::isUrl()`, which earlier Laravel 10 releases do not have.

The 1.x line supports Livewire 1, and the 2.x line Livewire 2; each has its own version of these docs.

### Why Livewire 3.8.3

Livewire 3.8.2 and earlier are affected by CVE-2026-81887 (DOM-based cross-site scripting during client-side state handling), and earlier releases by CVE-2025-54068 (remote command execution during property hydration) and CVE-2024-47823. Requiring 3.8.3 keeps every known Livewire advisory out of applications that install this line, and every Livewire 3 application can update to it within its major.

### How it uses Livewire 3

- The runtime owns registration, discovery, ownership, the lifecycle, the bridge contract, and diagnostics.
- It follows Livewire 3 through its documented hooks (`component.init`, `element.init`, `morph.added`, `morph.updating`, `morph.updated`, `morph.removed`, `commit`), component cleanups, and the `livewire:initialized`, `livewire:navigating`, and `livewire:navigated` events.
- Livewire 3 reports every element its morph visits, so an element counts as changed, and gets `update()`, only when it differs from the new server HTML.
- `set()` uses `$wire.$set()` and `call()` uses `$wire.$call()`, so `call()` resolves with the method's return value. Livewire 3 never settles those promises when a request fails, so the bridge binds each write and call to the component's next commit and rejects it with `request-failed` when that commit fails.

Livewire 3 has no public API for two things the bridge needs, so the runtime reads these internals and nothing else: the component objects behind `Livewire.all()` and their client state, for `get()`, and the "initial render finished" flag, to detect an already started Livewire.

:::warning Unmaintained Laravel versions
Laravel 10 and 11 no longer receive security fixes. This line supports them because Livewire 3 does, but your application still carries their advisories. Plan your upgrade to Laravel 12 or 13.
:::
