## Examples

### 1. A dependency-free input

An integration does not need jQuery. This one binds a plain input to a property, keeps it in step with server changes, and releases its listener through `onCleanup` instead of a returned function.

```js title="resources/js/integrations/live-input.js"
const liveInput = {
    mount({ element, property, component, onCleanup }) {
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

Encode options with `json_encode` inside `{{ }}`. Blade escapes the quotes, and the browser decodes them again when it reads the attribute, so any value is safe.

```blade title="resources/views/livewire/tags.blade.php"
<div wire:ignore wire:key="tags-field">
    <select multiple data-pharaonic="select2" data-property="tags" data-options="{{ json_encode(['tags' => true, 'placeholder' => __('Add tags')]) }}"></select>
</div>
```

:::warning Not @json with an array literal
On every Laravel version this line supports, `@json` splits its argument on commas. With an array literal such as `@json(['tags' => true, 'placeholder' => '…'])`, it loses the flags that escape apostrophes, so a translated placeholder like "l'étiquette" ends a single-quoted attribute early, and longer arrays are cut off. Use `@json($options)` with a variable, or `json_encode` as above.
:::

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
