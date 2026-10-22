## Installation

Install the package with Composer and load its runtime once per page.

### Requirements

- PHP 8.0 to 8.3, as supported by your Laravel version
- Laravel 7.30+, 8.75+, 9, or 10
- Livewire 2.12.7 or later (see [Compatibility](#compatibility))
- A modern browser (ES2019); Internet Explorer is not supported

### Composer Installation

```bash title="Terminal" no-line-numbers
composer require pharaonic/livewire-assistant
```

Laravel discovers `Pharaonic\Livewire\Assistant\AssistantServiceProvider` automatically. There is nothing to publish and no configuration file.

:::warning Composer and unmaintained releases
Livewire 2.12.7 and later have no known advisories, but every Laravel 7, 8, 9, and 10 release has security advisories that no release in its major fixes. Adding this package to an existing application works, because Composer leaves locked packages alone. When you later install or update the framework, recent Composer versions refuse to resolve it and name each blocked package.

If you accept the risk, allow those packages in your application's `composer.json`. These lists resolve a fresh application with Livewire 2:

| Laravel | Packages to allow |
| --- | --- |
| 7 | `laravel/framework`, `league/commonmark`, `league/flysystem` |
| 8 | `laravel/framework`, `league/flysystem` |
| 9 on PHP 8.0 | `laravel/framework`, `symfony/http-foundation`, `symfony/mailer`, `symfony/mime`, `symfony/process`, `symfony/routing`, `symfony/yaml` |
| 9 on PHP 8.1+, 10 | `laravel/framework` |

```bash title="Terminal" no-line-numbers
composer config --json policy.advisories.ignore '{"laravel/framework": "No fixed release within this Laravel major."}'
```
:::

### Load the Runtime

Add `@livewireAssistantScripts` to your layout. It can go before or after `@livewireScripts`.

```blade title="resources/views/layouts/app.blade.php"
<body>
    {{ $slot }}

    @livewireScripts
    @livewireAssistantScripts
</body>
```

The directive renders one `<script>` tag per page, even when layouts, partials, and components call it several times. It uses Laravel's own `@once` mechanism.

```html no-copy
<script src="https://example.com/pharaonic/livewire-assistant/assistant.js?id=3f9a1c2b7d4e5f60" data-turbo-eval="false" data-turbolinks-eval="false"></script>
```

### Content Security Policy

Pass a nonce when your CSP uses one. It is escaped before rendering.

```blade title="resources/views/layouts/app.blade.php"
@livewireAssistantScripts(['nonce' => $cspNonce])
```

Only the first call on a page renders, so pass the nonce there (normally in the layout). `nonce` is the only option. An unknown option or a non-string nonce throws an `InvalidArgumentException` while the view renders. The runtime never uses `eval`, inline scripts, or remote code, so `script-src 'self'` (or the nonce) is enough.

### How the Script Is Served

The package registers one route, outside the `web` middleware group, so it uses no session or cookies:

| Route | Name |
| --- | --- |
| `GET /pharaonic/livewire-assistant/assistant.js` | `pharaonic.livewire-assistant.script` |

It serves `dist/livewire-assistant.js` from the installed package. The `id` query value is a hash of the file content:

- a request whose `id` matches the installed build is cached for a year (`immutable`);
- any other request is served with `no-cache`.

Your web server must pass this URL to Laravel, the same way it passes Livewire's own `/livewire/livewire.js`. A rule that serves every `.js` URL from `public/` and returns 404 otherwise breaks both.

After `composer update`, the hash changes, so browsers fetch the new runtime on the next page load. There is no asset to publish, and nothing can go stale. The route works with `php artisan route:cache`.

To load the script without the directive, use the route name:

```blade title="resources/views/layouts/app.blade.php"
<script src="{{ route('pharaonic.livewire-assistant.script') }}" data-turbo-eval="false" data-turbolinks-eval="false"></script>
```

Without an `id`, the browser revalidates on every load. Prefer the directive.

### ES Module

If you bundle your JavaScript, you can import the ES module build from the Composer package instead. It has the same named exports as `window.Pharaonic.assistant`.

```js title="resources/js/app.js"
import { register } from '../../vendor/pharaonic/livewire-assistant/dist/livewire-assistant.esm.js'

register('example', {
    mount(context) {
        // ...
    },
})
```

The ES module and the browser build share one runtime per page. Whichever loads first installs it, and the other reuses it, so you can use the module in your bundle and keep the directive in your layout without registering anything twice.

:::success Installation Complete
The runtime starts by itself. Next, mark elements and register an integration.
:::
