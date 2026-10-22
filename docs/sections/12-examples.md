## Examples

### 1. A dependency-free input

An integration does not need jQuery. This one binds a plain input to a property and keeps it in step with server changes.

```js title="resources/js/integrations/live-input.js"
const liveInput = {
    mount({ element, property, component, onCleanup }) {
        const apply = (value) => {
            const next = value === null || value === undefined ? '' : String(value)

            if (element.value !== next) {
                element.value = next
            }
        }

        const onInput = () => component.set(property, element.value)

        apply(component.get(property))
        element.addEventListener('input', onInput)
        onCleanup(() => element.removeEventListener('input', onInput))
        component.watch(property, apply)
    },
}

;(window.PharaonicAssistantQueue ??= []).push((assistant) => assistant.register('live-input', liveInput))
```

### 2. An action-only integration

Integrations that only trigger actions need no `data-property`.

- ===Integration

  ```js title="resources/js/integrations/confirm-button.js"
  const confirmButton = {
      mount({ element, options, component }) {
          const onClick = () => {
              if (window.confirm(options.message ?? 'Are you sure?')) {
                  component.call(options.action).catch((error) => console.error(error))
              }
          }

          element.addEventListener('click', onClick)

          return () => element.removeEventListener('click', onClick)
      },
  }

  ;(window.PharaonicAssistantQueue ??= []).push((assistant) => assistant.register('confirm-button', confirmButton))
  ```

- ===Blade View

  ```blade title="resources/views/livewire/post-row.blade.php"
  <div>
      <button type="button" data-pharaonic="confirm-button" data-options='{"action": "delete", "message": "Delete this post?"}'>
          Delete
      </button>
  </div>
  ```

### 3. Options from PHP

Encode options with `@json` inside a single-quoted attribute: its default flags escape apostrophes, quotes, and HTML characters inside the values.

```blade title="resources/views/livewire/tags.blade.php"
<div wire:ignore wire:key="tags-field">
    <select multiple data-pharaonic="select2" data-property="tags" data-options='@json(["tags" => true, "placeholder" => __("Add tags")])'></select>
</div>
```

### 4. Content added by your own script

```js title="resources/js/app.js"
const panel = document.querySelector('#filters')

panel.insertAdjacentHTML('beforeend', templateHtml)
Pharaonic.assistant.scan(panel)

// Later, before removing it yourself:
Pharaonic.assistant.destroy(panel)
panel.remove()
```

### 5. Reporting failures

```js title="resources/js/app.js"
window.addEventListener('pharaonic:assistant:error', ({ detail }) => {
    if (detail.code === 'mount-failed') {
        detail.element?.classList.add('widget-failed')
    }
})
```
