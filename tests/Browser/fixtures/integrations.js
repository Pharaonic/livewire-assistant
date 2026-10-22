/*
 * Fixture integrations for the browser suite. They follow the integration
 * guide: the runtime is never downloaded here, only registered with.
 */
(function () {
    var log = (window.fixtureLog = window.fixtureLog || {
        via: null,
        mount: {},
        update: {},
        cleanup: {},
        watch: {},
        writes: [],
        listeners: 0,
        rejections: [],
    })

    function count(bucket, name) {
        log[bucket][name] = (log[bucket][name] || 0) + 1
    }

    var NAMESPACE = '.pharaonicAssistant'

    // Select2 reports '' or [] for "nothing selected"; Livewire may hold null.
    function toWidget(value, multiple) {
        if (multiple) {
            return Array.isArray(value) ? value.map(String) : []
        }

        return value === null || value === undefined ? '' : String(value)
    }

    function same(left, right) {
        return JSON.stringify(left) === JSON.stringify(right)
    }

    var select2 = {
        mount: function (context) {
            var $element = window.jQuery(context.element)
            var multiple = context.element.multiple
            var component = context.component

            count('mount', 'select2')
            $element.select2(context.options)

            if (context.property !== null) {
                var current = function () {
                    return toWidget($element.val(), multiple)
                }

                var apply = function (value) {
                    var next = toWidget(value, multiple)

                    // Equal values never touch the widget, so they cannot echo back.
                    if (!same(next, current())) {
                        // Only Select2's namespace is notified; our change handler stays silent.
                        $element.val(next).trigger('change.select2')
                    }
                }

                apply(component.get(context.property))

                $element.on('change' + NAMESPACE, function () {
                    var value = current()

                    if (same(value, toWidget(component.get(context.property), multiple))) {
                        return
                    }

                    log.writes.push([context.property, value])
                    component.set(context.property, value).catch(function (error) {
                        log.rejections.push(error.code || error.message)
                    })
                })

                component.watch(context.property, function (value) {
                    count('watch', 'select2')
                    apply(value)
                })
            }

            return function () {
                count('cleanup', 'select2')
                // Remove only our handlers, then restore the native <select>.
                $element.off(NAMESPACE)
                $element.select2('destroy')
            }
        },
    }

    var nativeInput = {
        mount: function (context) {
            var element = context.element
            var component = context.component

            count('mount', 'native-input')
            element.mountedHint = context.options.hint || ''

            if (context.property === null) {
                return undefined
            }

            var apply = function (value) {
                var next = value === null || value === undefined ? '' : String(value)

                if (element.value !== next) {
                    element.value = next
                }
            }

            var onInput = function () {
                log.writes.push([context.property, element.value])
                component.set(context.property, element.value).catch(function (error) {
                    log.rejections.push(error.code || error.message)
                })
            }

            apply(component.get(context.property))
            element.addEventListener('input', onInput)
            log.listeners++

            context.onCleanup(function () {
                element.removeEventListener('input', onInput)
                log.listeners--
            })

            component.watch(context.property, function (value) {
                count('watch', 'native-input')
                apply(value)
            })

            return function () {
                count('cleanup', 'native-input')
            }
        },
        update: function () {
            count('update', 'native-input')
        },
    }

    window.fixtureIntegrations = { select2: select2, nativeInput: nativeInput }

    var registerAll = function (assistant) {
        assistant.register('select2', select2)
        assistant.register('native-input', nativeInput)
    }

    if (window.Pharaonic && window.Pharaonic.assistant) {
        log.via = log.via || 'direct'
        registerAll(window.Pharaonic.assistant)
    } else {
        log.via = log.via || 'queue'
        ;(window.PharaonicAssistantQueue = window.PharaonicAssistantQueue || []).push(registerAll)
    }
})()
