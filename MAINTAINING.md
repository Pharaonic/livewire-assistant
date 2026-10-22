# Maintaining This Package

This file records package-specific maintainer facts that are safe to keep in the public repository.

## Purpose

A shared Blade and JavaScript foundation for Pharaonic Livewire integrations. It discovers `data-pharaonic` elements, resolves their Livewire components, exposes a component bridge, and manages widget mounting, updates, and cleanup. Widget integrations (Select2, phone numbers, …) live in their own packages or applications; the core contains none.

## Supported lines

One line per Livewire major. `develop` follows the newest line.

| Line | Livewire | Laravel | PHP |
| --- | --- | --- | --- |
| 1.x | `>=1.3.0 <1.3.7 \|\| >=1.3.8 <2.0` | `^7.30 \|\| ^8.75` | `>=7.4 <8.0` |
| 2.x | `^2.12.7` | `^7.30 \|\| ^8.75 \|\| ^9.0 \|\| ^10.0` | `>=8.0 <8.4` |

Versions are `N.minor.patch`, where `N` is the Livewire major.

## Core library

None. The PHP side is Laravel glue only; the runtime is JavaScript.

## Public API invariants

- Blade directive `@livewireAssistantScripts` and its `nonce` option.
- Route `GET /pharaonic/livewire-assistant/assistant.js`, named `pharaonic.livewire-assistant.script`.
- `window.Pharaonic.assistant` (`register`, `start`, `scan`, `destroy`) and the same named ESM exports.
- The integration definition, context, and component bridge contracts in `docs/sections/`.
- The `data-pharaonic`, `data-property`, `data-component-id`, and `data-options` attributes.
- `window.PharaonicAssistantQueue`, the `pharaonic:assistant:error` event, and every error code.

## Package-specific constraints

- Each line serves one Livewire major. Everything that touches Livewire lives in `resources/js/livewire.js`, and `resources/js/runtime.js` reaches it only through the connection that file returns, so runtime fixes port between lines unchanged. The Livewire internals a line reads are listed at the top of its `livewire.js`.
- `dist/` is committed so Composer users need no Node build. Run `npm run build` after any change under `resources/js/` and commit the result; CI fails when `dist/` is out of date.
- 1.x: every genuine Livewire 1 release requires PHP 7, so the line runs on PHP 7.4. Pint cannot install there: it lives in `tools/pint` on that branch and runs on PHP 8.1. `livewire/livewire` 1.3.7 contains Livewire 2 code and is excluded. The advisory ignore list adds Livewire 1 (CVE-2024-47823 has no Livewire 1 fix) and `zbateson/mail-mime-parser`.
- 2.x: Livewire 2 supports Laravel 7 to 10, so one line covers four Laravel majors, each on the PHP minors it supports (8.0 to 8.3). `^2.12.7` keeps every Livewire release with CVE-2024-47823 out. CI lists each Laravel major with its PHP minors; `composer check`, including Pint, runs on PHP 8.0 with the highest dependencies, which resolve Laravel 9. Browser tests run on the lowest PHP of each Laravel major, with the `livewire-turbolinks` adapter Livewire 2 needs for Turbolinks and Turbo.
- The advisory ignore list covers the Laravel framework tree of the line, which no longer receives security fixes, following the Laravel DNA.

## Verification

```bash
php8.0 composer check
npm ci
npm run check            # lint, unit tests, dist check, browser tests
```

Browser tests start `php -S` on the fixture app in `tests/Browser`. They use `php8.0` unless `FIXTURE_PHP` names another PHP 8.0 to 8.3 binary, and stop with an error on any other PHP version. Set `BROWSERS=chromium,firefox,webkit` to choose browsers. Run PHPStan and Pest for every PHP minor of each Laravel major, and the browser tests on its lowest PHP, with lowest and highest dependencies, for example:

```bash
php8.1 composer update --with laravel/framework:^10.0 --with orchestra/testbench:^8.0 --prefer-lowest
```

## Branch notes

The repository started with the 1.x line (Livewire 1); 2.x follows Livewire 2. Livewire 3 and 4 lines are planned, each with its own `resources/js/livewire.js`.

## Documentation

https://pharaonic.dev/packages/livewire/assistant

Keep this file factual and package-specific. General Pharaonic engineering policy belongs in the private engineering repository, not here.
