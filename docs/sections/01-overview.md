:::badges
- Livewire Package {color=blue}
- {release.label} {color=green}
- {package.license} License {color=purple}
:::

# Livewire Assistant

Livewire Assistant is the shared foundation that binds JavaScript widgets such as Select2 to Livewire components. You mark an element with `data-pharaonic`, register a small integration once, and the Assistant finds the element, resolves the Livewire component that owns it, gives the integration a component bridge, and mounts, updates, and cleans the widget up as Livewire changes the page.

:::features
### Declarative markup {icon="code-brackets"}
A data-pharaonic attribute names the integration; data-property, data-component-id and data-options configure it.

### Correct ownership {icon="users"}
Elements bind to their nearest Livewire component, or to an explicit component id, never to a parent by accident.

### Component bridge {icon="switch"}
Read state, write properties, call actions, and watch property changes through one small API.

### Lifecycle handled {icon="automation"}
Instances mount once, update on relevant DOM changes, remount when their binding changes, and clean up on removal and navigation.

### Observable failures {icon="alert-circle"}
Every automatic failure becomes a pharaonic:assistant:error event with a stable code; nothing fails silently.

### No Node build required {icon="package"}
The runtime ships prebuilt inside the Composer package and loads through one Blade directive.
:::

:::info Livewire 2 line
This documentation covers the 2.x line, which supports Livewire 2. Each Livewire major gets its own line.
:::
