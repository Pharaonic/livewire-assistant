# Maintaining This Package

This file records package-specific maintainer facts that are safe to keep in the public repository.

## Purpose

A shared Blade and JavaScript foundation for Pharaonic Livewire integrations. It discovers `data-pharaonic` elements, resolves their Livewire components, exposes a component bridge, and manages widget mounting, updates, and cleanup. Widget integrations (Select2, phone numbers, …) live in their own packages or applications; the core contains none.

## Supported lines

One line per Livewire major. `develop` follows the newest line.

| Line | Livewire | Laravel | PHP |
| --- | --- | --- | --- |
| 1.x | `>=1.3.0 <1.3.7 \|\| >=1.3.8 <2.0` | `^7.30 \|\| ^8.75` | `>=7.4 <8.0` |

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

- This line serves Livewire 1 only. Everything that touches Livewire lives in `resources/js/livewire.js`, and `resources/js/runtime.js` reaches it only through the connection that file returns, so runtime fixes port between lines unchanged. The Livewire 1 internals it reads are listed at the top of that file.
- `dist/` is committed so Composer users need no Node build. Run `npm run build` after any change under `resources/js/` and commit the result; CI fails when `dist/` is out of date.
- Every genuine Livewire 1 release requires PHP 7, so the 1.x line runs on PHP 7.4. Pint cannot install on PHP 7.4: it lives in `tools/pint` and runs on PHP 8.1 (`php8.1 composer format`). `composer check` covers validation, PHPStan, Pest, and the audit on PHP 7.4.
- `livewire/livewire` 1.3.7 contains Livewire 2 code and is excluded from the constraint.
- The advisory ignore list covers the Laravel 7/8 framework tree, Livewire 1 (CVE-2024-47823 has no Livewire 1 fix), and `zbateson/mail-mime-parser`, which only reaches the development install through Testbench and has no PHP 7.4 fix.

## Verification

```bash
php7.4 composer check
php8.1 composer --working-dir=tools/pint update && php8.1 composer format:check
npm ci
npm run check            # lint, unit tests, dist check, browser tests
```

Browser tests start `php -S` on the fixture app in `tests/Browser`. They use `php7.4` unless `FIXTURE_PHP` names another PHP 7.4 binary, and stop with an error on any other PHP version. Set `BROWSERS=chromium,firefox,webkit` to choose browsers. Run them for Laravel 7 and 8 with lowest and highest dependencies, for example:

```bash
php7.4 composer update --with laravel/framework:^7.30 --with orchestra/testbench:^5.20 --prefer-lowest
```

## Branch notes

The repository starts with the 1.x line. Livewire 2, 3, and 4 lines are planned, each with its own `resources/js/livewire.js`.

## Documentation

https://pharaonic.dev/packages/livewire/assistant

Keep this file factual and package-specific. General Pharaonic engineering policy belongs in the private engineering repository, not here.
