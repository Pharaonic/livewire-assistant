## Compatibility

Every combination below installs with Composer and passes the PHP suite and the real-browser suite (real Livewire 1 components driven in real browsers) with lowest and highest dependencies. CI also runs the browser suite in WebKit.

| Line | Livewire | Laravel | PHP | Browsers |
| --- | --- | --- | --- | --- |
| 1.x | 1.3.0 to 1.3.9, except 1.3.7 | 7.30+ | 7.4 | Chromium, Firefox |
| 1.x | 1.3.0 to 1.3.9, except 1.3.7 | 8.75+ | 7.4 | Chromium, Firefox |

Tested boundaries: Laravel 7.30.3 and 8.75.0 with Livewire 1.3.0 (lowest), and Laravel 7.30.7 and 8.83.29 with Livewire 1.3.9 (highest).

### Why PHP 7.4

Every Livewire 1 release requires PHP 7 (`^7.1.3`). PHP 7.4 is the oldest PHP the package's test and analysis tools run on, so the 1.x line supports PHP 7.4 only.

### Why not Livewire 1.3.7

The `livewire/livewire` 1.3.7 release on Packagist contains Livewire 2 code: it allows PHP 8, but its browser API and wire format are Livewire 2's. The 1.x line excludes it in Composer, and if it is on a page anyway the runtime reports `livewire-unsupported` instead of binding to an API it does not know.

### How it uses Livewire 1

- The runtime owns registration, discovery, ownership, the lifecycle, the bridge contract, and diagnostics.
- It follows Livewire 1 through its documented hooks (`componentInitialized`, `elementInitialized`, `afterElementUpdate`, `elementRemoved`, `responseReceived`, `messageFailed`), component teardown callbacks, and Turbolinks events.

Livewire 1 has no public API for two things the bridge needs, so the runtime reads these internals and nothing else: the component's action queue and in-flight message, to settle `set()` and `call()` with the request that carried them, and the component store with its "initial render finished" flag, to detect replaced components and an already started Livewire.

### What Livewire 1 cannot do

| Contract | On Livewire 1 |
| --- | --- |
| `set(path, value, { live: false })` | Rejects with `unsupported-operation`; Livewire 1 has no deferred updates. |
| `call()` result | Resolves to `undefined`; Livewire 1 actions return no value. |
| `get()` after `set()` | Shows the new value once the round trip finished. |

Later lines for Livewire 2, 3, and 4 keep the same contract.

:::warning Livewire 1 security
Livewire 1 no longer receives fixes. CVE-2024-47823 (remote code execution through file uploads) affects every Livewire release before 2.12.7, including all of Livewire 1. This package does not use file uploads, but your application does if it uses Livewire's `WithFileUploads`. Plan your upgrade.
:::
