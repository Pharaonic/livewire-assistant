---
view: components.packages.quick-look
title: A quick look
subtitle: Register an integration once; every marked element in every component gets its own instance.
file: resources/js/integrations/select2.js
language: js
code: |
  Pharaonic.assistant.register('select2', {
      mount({ element, property, options, component }) {
          const $element = jQuery(element).select2(options)

          $element.val(component.get(property) ?? '').trigger('change.select2')
          $element.on('change.pharaonicAssistant', () => component.set(property, $element.val()))
          component.watch(property, (value) => $element.val(value ?? '').trigger('change.select2'))

          return () => $element.off('.pharaonicAssistant').select2('destroy')
      },
  })
---
