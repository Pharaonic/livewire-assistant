<p align="center"><a href="https://pharaonic.dev/packages/livewire/assistant" target="_blank"><img src="https://raw.githubusercontent.com/Pharaonic/livewire-assistant/develop/docs/cover.webp" alt="Livewire Assistant"></a></p>

<p align="center">
  <a href="https://php.net" target="_blank"><img src="https://img.shields.io/static/v1?label=PHP&message=8.0%20|%208.1%20|%208.2%20|%208.3&color=blue&style=flat-square" alt="PHP Version : 8.0 | 8.1 | 8.2 | 8.3"></a>
  <a href="https://laravel.com" target="_blank"><img src="https://img.shields.io/static/v1?label=Laravel&message=7.x%20|%208.x%20|%209.x%20|%2010.x&color=F05340&style=flat-square" alt="Laravel Version : 7.x | 8.x | 9.x | 10.x"></a>
  <a href="https://laravel-livewire.com" target="_blank"><img src="https://img.shields.io/static/v1?label=Livewire&message=2.x&color=fb70a9&style=flat-square" alt="Livewire Version : 2.x"></a>
  <img src="https://img.shields.io/static/v1?label=License&message=MIT&color=brightgreen&style=flat-square" alt="License">
  <img src="https://github.com/Pharaonic/livewire-assistant/actions/workflows/build.yml/badge.svg?branch=2.x" alt="Build">
  <br>
  <a href="https://packagist.org/packages/Pharaonic/livewire-assistant" target="_blank"><img src="https://img.shields.io/static/v1?label=Packagist&message=pharaonic/livewire-assistant&color=blue&logo=packagist&logoColor=white" alt="Source"></a>
  <a href="https://packagist.org/packages/pharaonic/livewire-assistant" target="_blank"><img src="https://poser.pugx.org/pharaonic/livewire-assistant/v" alt="Packagist Version"></a>
  <a href="https://packagist.org/packages/pharaonic/livewire-assistant" target="_blank"><img src="https://poser.pugx.org/pharaonic/livewire-assistant/downloads" alt="Packagist Downloads"></a>
</p>

<h3 align="center">Bind JavaScript widgets such as Select2 to Livewire components.</h3>
<h5 align="center">Discovery, component ownership, a component bridge, and the mount, update, and cleanup lifecycle.</h5>
<br>

## Installation

```bash
composer require pharaonic/livewire-assistant
```

The service provider is registered automatically. Load the runtime once in your layout, before or after `@livewireScripts`:

```blade
@livewireScripts
@livewireAssistantScripts
```

No Node build is needed. The 2.x line supports Livewire 2.12.7+ on Laravel 7.30+, 8.75+, 9, and 10 with PHP 8.0 to 8.3. For Livewire 1, use the 1.x line.

Laravel 7 to 10 no longer receive security fixes, so recent Composer versions refuse to install or update them until you allow their advisories. The installation guide lists the packages to allow.

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

Load this script after `@livewireAssistantScripts`, or register through `window.PharaonicAssistantQueue` so the order does not matter. jQuery and Select2 are your application's dependencies. The documentation has the complete Select2 integration, including loop prevention.

## Documentation

Read the full [Livewire Assistant documentation](https://pharaonic.dev/packages/livewire/assistant) for installation, writing integrations, the component bridge, and examples.

## Support & Security

See [SUPPORT.md](SUPPORT.md) and [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
