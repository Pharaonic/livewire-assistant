## Basic Usage

An integration has two parts: markup that names it, and a JavaScript definition registered once.

### Markup

```blade title="resources/views/livewire/profile.blade.php"
<div>
    <div wire:ignore>
        <select data-pharaonic="select2" data-property="country_id">
            <option value="">Choose a country</option>
            <option value="1">Egypt</option>
        </select>
    </div>
</div>
```

| Attribute | Meaning |
| --- | --- |
| `data-pharaonic` | The integration name. Exactly one name per element; surrounding whitespace is trimmed. Required. |
| `data-property` | A property path such as `country_id` or `address.city`. Optional; only integrations that bind a property need it. |
| `data-component-id` | An explicit Livewire component id. Optional; it takes precedence over the nearest component. |
| `data-options` | A JSON object handed to the integration. Optional; parsed with `JSON.parse`, never evaluated. |

### Registration

Register the integration from your own script. It can load before or after the Assistant; see [Load Order](#load-order).

```js title="resources/js/integrations/example.js"
const example = {
    mount(context) {
        const { element, property, component } = context

        element.value = component.get(property) ?? ''

        const onInput = () => component.set(property, element.value)

        element.addEventListener('input', onInput)
        component.watch(property, (value) => {
            if (element.value !== String(value ?? '')) {
                element.value = value ?? ''
            }
        })

        return () => element.removeEventListener('input', onInput)
    },
}

if (window.Pharaonic?.assistant) {
    window.Pharaonic.assistant.register('example', example)
} else {
    (window.PharaonicAssistantQueue ??= []).push((assistant) => assistant.register('example', example))
}
```

The Assistant mounts every matching element when Livewire is ready, mounts new ones when Livewire adds them, and runs the returned cleanup when they leave the page.

:::tip Watchers clean up after themselves
Subscriptions made through `context.component.watch()` belong to the mounted instance and end with it. You only clean up what you created yourself, such as DOM listeners and widgets.
:::
