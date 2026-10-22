## Select2 Walkthrough

This is the Select2 integration the package's browser suite runs against real Livewire 3 components. jQuery and Select2 are your application's dependencies; the Assistant does not ship them.

### 1. The component

```php title="app/Http/Livewire/Profile.php"
<?php

namespace App\Http\Livewire;

use Livewire\Component;

class Profile extends Component
{
    public $country = '2';

    public $tags = ['a'];

    public function render()
    {
        return view('livewire.profile');
    }
}
```

### 2. The view

```blade title="resources/views/livewire/profile.blade.php"
<div>
    <div wire:ignore wire:key="country-field">
        <select data-pharaonic="select2" data-property="country" data-options='{"placeholder": "Choose a country", "allowClear": true}'>
            <option value="">Choose a country</option>
            <option value="0">Zero Land</option>
            <option value="1">Egypt</option>
            <option value="2">Jordan</option>
        </select>
    </div>

    <div wire:ignore wire:key="tags-field">
        <select multiple data-pharaonic="select2" data-property="tags">
            <option value="a">A</option>
            <option value="b">B</option>
        </select>
    </div>
</div>
```

`data-options` goes to Select2 as its configuration.

### 3. The integration

```js title="resources/js/integrations/select2.js"
const NAMESPACE = '.pharaonicAssistant'

// Select2 reports '' or [] for "nothing selected"; Livewire may hold null.
const toWidget = (value, multiple) => {
    if (multiple) {
        return Array.isArray(value) ? value.map(String) : []
    }

    return value === null || value === undefined ? '' : String(value)
}

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const select2 = {
    mount({ element, property, options, component }) {
        const $element = window.jQuery(element)
        const multiple = element.multiple

        $element.select2(options)

        if (property !== null) {
            const current = () => toWidget($element.val(), multiple)

            const apply = (value) => {
                const next = toWidget(value, multiple)

                // Equal values never touch the widget, so they cannot echo back.
                if (!same(next, current())) {
                    // Notify only Select2's own namespace; our change handler stays silent.
                    $element.val(next).trigger('change.select2')
                }
            }

            apply(component.get(property))

            $element.on(`change${NAMESPACE}`, () => {
                const value = current()

                if (!same(value, toWidget(component.get(property), multiple))) {
                    component.set(property, value).catch((error) => console.error(error))
                }
            })

            component.watch(property, apply)
        }

        return () => {
            // Remove only our handlers, then restore the native <select>.
            $element.off(NAMESPACE)
            $element.select2('destroy')
        }
    },
}

const registerSelect2 = (assistant) => assistant.register('select2', select2)

if (window.Pharaonic?.assistant) {
    registerSelect2(window.Pharaonic.assistant)
} else {
    (window.PharaonicAssistantQueue ??= []).push(registerSelect2)
}
```

### How the two directions stay in sync

- **Initial value.** `mount` reads the property with `get()` and selects it.
- **User to server.** Select2 fires `change`; the handler sends the new value with `set()`.
- **Server to widget.** `watch()` reports the new value after each Livewire update, and `apply` selects it.
- **No loop.** A server value is applied with `trigger('change.select2')`, which only notifies Select2, so the handler that writes to Livewire does not run. Both directions also compare values first: an equal value is neither applied nor sent.
- **No data loss.** Values are compared as strings and arrays, never by truthiness, so `0`, `''`, and `null` stay distinct where Select2 can represent them: `null` and `''` both show the empty option, `0` selects the option with value `0`.

Loop prevention belongs to the integration because only it knows when two values are the same for its widget. The Assistant gives it the events and the ownership, not a global "ignore equal writes" rule.

### Cleanup

The cleanup removes the handlers in the `.pharaonicAssistant` namespace only, so handlers your application added to the same element survive, then destroys Select2. The watcher ends by itself.
