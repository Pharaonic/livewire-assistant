## Targeting and the DOM

### Nearest component

Without `data-component-id`, an element belongs to the closest element with a `wire:id`, which may be the element itself. An element inside a nested component belongs to that child, never to the parent around it.

```blade title="resources/views/livewire/order.blade.php"
<div>
    <select data-pharaonic="select2" data-property="status"></select>  {{-- order --}}

    @livewire('address-form')  {{-- its own elements bind to address-form --}}
</div>
```

An element outside every component and without an explicit id is reported as `component-not-found` once and left alone.

### Explicit component

`data-component-id` binds an element to a specific component wherever it is. In a Livewire 4 view, the component id is `$this->getId()`.

```blade title="resources/views/livewire/order.blade.php"
<select data-pharaonic="select2" data-property="status" data-component-id="{{ $this->getId() }}"></select>
```

If no component has that id, the Assistant reports `component-not-found` and does **not** fall back to another component. The element is mounted later if a component with that id initializes; there is no polling.

### wire:ignore

Livewire morphs a component's DOM to match the server HTML after each request. Widgets such as Select2 hide the original element and insert their own markup, which morphing would remove. Wrap such widgets in `wire:ignore` yourself; the Assistant never adds or changes Livewire attributes.

```blade
<div wire:ignore wire:key="country-field">
    <select data-pharaonic="select2" data-property="country_id">...</select>
</div>
```

Inside `wire:ignore`, Livewire does not touch the element at all:

- the instance and its widget survive every request;
- `update()` never runs, and new server HTML for the element is ignored, including changed `data-options`;
- server-side property changes reach the widget only through `component.watch()`.

:::warning Key your ignored blocks
Livewire morphs siblings by position. When an ignored block can appear or disappear next to other ignored blocks, give each a unique `wire:key`. Otherwise Livewire compares the wrong blocks, skips the one that should change, and removes a different one. Livewire also uses an element's `id` as its key when there is no `wire:key`, so never reuse an inner element's `id` as a `wire:key`.
:::

Elements that are not ignored can still be integrations, for example a native input that only listens to events. Livewire then updates their attributes, and the Assistant calls `update()` or remounts them. Do not store integration state in attributes of such elements: the next morph removes them and counts as a change.

### Dynamic elements

Elements that Livewire adds are mounted after Livewire finishes the update, and removed ones are cleaned up right after it. Elements you add or remove yourself, outside a Livewire update, need one call:

```js
Pharaonic.assistant.scan(container)     // mounts the container and everything matching inside it
Pharaonic.assistant.destroy(container)  // cleans up the container and everything inside it
```

Both include the root element itself, are safe to repeat, and never duplicate an instance. `destroy()` also forgets failed mounts, so a following `scan()` tries them again. The Assistant does not observe the whole document for mutations.

### Navigation

Livewire 4 navigates with `wire:navigate`. Just before it leaves a page, the Assistant cleans every instance up, so the page Livewire keeps for the back button holds the original elements and not initialized widgets. When a page is shown, through a link, back, or forward, the elements are mounted again with the new components. Full page loads need nothing special.

`wire:navigate` runs every `<script>` in the new page's body again, unless it has `data-navigate-once`. The runtime's tag has it. Give your integration scripts `data-navigate-once` too, or load them in `<head>`, which Livewire merges instead of running again: a script that runs again registers a new definition object under the same name, which throws `registration-conflict`.
