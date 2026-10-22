# Livewire Assistant

Shared Blade and JavaScript foundation that binds JavaScript widgets, such as Select2, to Livewire components: discovery, component ownership, a component bridge, and the mount, update, and cleanup lifecycle.

## Installation

```bash
composer require pharaonic/livewire-assistant
```

The service provider is registered automatically. Load the runtime once in your layout, before or after `@livewireScripts`:

```blade
@livewireScripts
@livewireAssistantScripts
```

No Node build is needed. The 1.x line supports Livewire 1 on Laravel 7.30+ and 8.75+ with PHP 7.4; see the [compatibility table](https://pharaonic.dev/packages/livewire/assistant) for the tested matrix.

## Usage

```blade
<div wire:ignore>
    <select data-pharaonic="select2" data-property="country_id">
        <option value="">Choose a country</option>
        <option value="1">Egypt</option>
    </select>
</div>
```

```js
Pharaonic.assistant.register('select2', {
    mount({ element, property, options, component }) {
        const $element = jQuery(element).select2(options)

        $element.val(component.get(property) ?? '').trigger('change.select2')
        $element.on('change.pharaonicAssistant', () => component.set(property, $element.val()))
        component.watch(property, (value) => $element.val(value ?? '').trigger('change.select2'))

        return () => $element.off('.pharaonicAssistant').select2('destroy')
    },
})
```

The documentation has the complete Select2 integration, including loop prevention.

## Documentation

Full documentation: https://pharaonic.dev/packages/livewire/assistant

## Support & Security

See [SUPPORT.md](SUPPORT.md) and [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
