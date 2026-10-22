## Load Order

The runtime, Livewire, and your integrations can load in any order.

### Livewire

`@livewireAssistantScripts` can come before or after `@livewireScripts`, or be loaded later. The Assistant connects when Livewire is available, and mounts elements once Livewire has initialized its components, including when Livewire already started.

| Situation | Result |
| --- | --- |
| Livewire 1 loads before or after the Assistant | Works, no duplicate hooks |
| Livewire never loads | `livewire-missing` after the page `load` event |
| Another Livewire major is on the page | `livewire-unsupported`; nothing mounts |

### Integrations

An integration must work whether the Assistant has loaded yet or not, and must never download or inject the Assistant itself. Use the global queue:

```js title="resources/js/integrations/select2.js"
const registerSelect2 = (assistant) => {
    assistant.register('select2', select2Definition)
}

if (window.Pharaonic?.assistant) {
    registerSelect2(window.Pharaonic.assistant)
} else {
    (window.PharaonicAssistantQueue ??= []).push(registerSelect2)
}
```

When the runtime loads, it runs every queued callback once with `window.Pharaonic.assistant`. A failing callback is reported as `queue-callback-failed`, and the others still run. After that, `window.PharaonicAssistantQueue.push()` runs callbacks immediately, so a late push is never lost.

### Why integrations do not load the runtime

There must be exactly one runtime per page: one registry, one set of Livewire hooks, one owner per element. If every integration loaded its own copy, they would compete for the same elements and leak listeners. The runtime arrives once, from the Composer dependency through `@livewireAssistantScripts`, or from your own bundle through the ES module. Loading it twice by mistake is harmless: the second copy reuses the first.

### Existing globals

The runtime adds `assistant` to `window.Pharaonic` and keeps every member already there.
