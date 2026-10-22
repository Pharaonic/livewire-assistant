## Basic Usage

An integration has two parts: markup that names it, and a JavaScript definition registered once.

### Markup

```blade title="resources/views/livewire/profile.blade.php"
<div>
    <input type="text" value="{{ $name }}" data-pharaonic="live-input" data-property="name">
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

```js title="resources/js/integrations/live-input.js"
const liveInput = {
    mount(context) {
        const { element, property, component } = context

        const apply = (value) => {
            const next = value === null || value === undefined ? '' : String(value)

            // Never overwrite what the user is still typing.
            if (element !== document.activeElement && element.value !== next) {
                element.value = next
            }
        }

        const onInput = () => component.set(property, element.value)

        apply(component.get(property))
        element.addEventListener('input', onInput)
        component.watch(property, apply)

        return () => element.removeEventListener('input', onInput)
    },
}

if (window.Pharaonic?.assistant) {
    window.Pharaonic.assistant.register('live-input', liveInput)
} else {
    (window.PharaonicAssistantQueue ??= []).push((assistant) => assistant.register('live-input', liveInput))
}
```

The Assistant mounts every matching element when Livewire is ready, mounts new ones when Livewire adds them, and runs the returned cleanup when they leave the page.

While the user types faster than Livewire requests return, `watch()` reports values they have already typed past, so the integration leaves the focused input alone. Widgets that rebuild their own markup, such as Select2, also need `wire:ignore`; see [Targeting and the DOM](#targeting).

:::tip Watchers clean up after themselves
Subscriptions made through `context.component.watch()` belong to the mounted instance and end with it. You only clean up what you created yourself, such as DOM listeners and widgets.
:::
