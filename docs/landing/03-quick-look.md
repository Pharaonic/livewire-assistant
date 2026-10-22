---
view: components.packages.quick-look
title: A quick look
subtitle: Register an integration once; every marked element in every component gets its own instance.
file: resources/js/integrations/live-input.js
language: js
code: |
  Pharaonic.assistant.register('live-input', {
      mount({ element, property, component }) {
          element.value = component.get(property) ?? ''

          const onInput = () => component.set(property, element.value)

          element.addEventListener('input', onInput)
          component.watch(property, (value) => (element.value = value ?? ''))

          return () => element.removeEventListener('input', onInput)
      },
  })
---
