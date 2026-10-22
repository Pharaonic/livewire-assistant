import { assistantError } from './diagnostics.js'

/**
 * Livewire 1 connection.
 *
 * Livewire 1 exposes its class as `window.Livewire` and the page instance as
 * `window.livewire`. Documented hooks (`livewire.hook`) drive discovery and
 * updates. Two internals are read because Livewire 1 offers no public API for
 * them, and both are confined to this file:
 *
 * - `component.actionQueue` and `component.messageInTransit`, to settle the
 *   promise of `set()` and `call()` with the request that carried the action;
 * - `livewire.components.componentsById` and `initialRenderIsFinished`, to
 *   detect replaced components and an already started Livewire.
 */
export const livewire = {
    present(win) {
        return win.livewire !== undefined || win.Livewire !== undefined
    },

    detect(win) {
        return typeof win.Livewire === 'function' && win.livewire instanceof win.Livewire
    },

    connect(win, events) {
        const livewire = win.livewire
        const store = livewire.components
        const document = win.document
        const tracked = new WeakSet()
        const operations = new Map()

        const track = (component) => {
            if (component && !tracked.has(component)) {
                tracked.add(component)
                component.addListenerForTeardown(() => {
                    rejectAll(component, () => assistantError('stale-context', `Component "${component.id}" was removed before its request finished.`))
                    events.componentRemoved(component)
                })
            }

            return component
        }

        const settle = (component, outcome) => {
            const message = component.messageInTransit
            const list = operations.get(component)

            if (!message || !list) {
                return
            }

            for (const operation of [...list]) {
                if (message.actionQueue.includes(operation.action)) {
                    list.splice(list.indexOf(operation), 1)
                    outcome(operation)
                }
            }
        }

        const rejectAll = (component, error) => {
            for (const operation of operations.get(component) ?? []) {
                operation.reject(error())
            }

            operations.delete(component)
        }

        const send = (component, dispatch) => new Promise((resolve, reject) => {
            const queue = component.actionQueue
            const length = queue.length

            dispatch()

            // A prefetched response is applied synchronously without queueing the action.
            if (component.actionQueue !== queue || queue.length === length) {
                resolve(undefined)

                return
            }

            const list = operations.get(component) ?? []

            list.push({ action: queue[queue.length - 1], resolve, reject })
            operations.set(component, list)
        })

        livewire.hook('componentInitialized', (component) => {
            track(component)
            events.componentAdded(component)
        })

        livewire.hook('elementInitialized', (element) => {
            if (element.el.hasAttribute('data-pharaonic')) {
                events.added(element.el)
            }
        })

        livewire.hook('afterElementUpdate', (node) => events.changed(node))
        livewire.hook('elementRemoved', (element) => events.removed(element.el))

        livewire.hook('responseReceived', (component) => {
            settle(component, (operation) => operation.resolve(undefined))
            events.settled(component)
        })

        livewire.hook('messageFailed', (component) => {
            settle(component, (operation) => operation.reject(
                assistantError('request-failed', `The Livewire request of component "${component.id}" failed.`),
            ))
        })

        // Livewire 1 restarts on every Turbolinks visit; widgets must leave the cached snapshot clean.
        document.addEventListener('turbolinks:before-cache', () => events.navigating())
        document.addEventListener('livewire:load', () => events.ready())

        if (store.initialRenderIsFinished) {
            events.ready()
        }

        const find = (id) => track(store.componentsById[id]) ?? null

        return {
            find,

            ownerOf(element) {
                const root = element.closest('[wire\\:id]')

                return root ? find(root.getAttribute('wire:id')) : null
            },

            idOf(component) {
                return component.id
            },

            isAlive(component) {
                return store.componentsById[component.id] === component
            },

            get(component, path) {
                return path.split('.').reduce((carry, segment) => (carry === null || carry === undefined ? undefined : carry[segment]), component.data)
            },

            set(component, path, value, { live }) {
                if (!live) {
                    return Promise.reject(assistantError('unsupported-operation', 'Deferred writes ({ live: false }) need Livewire 2 or newer; Livewire 1 sends every write immediately.'))
                }

                return send(component, () => component.set(path, value))
            },

            call(component, method, args) {
                // Livewire 1 actions return no value to the browser.
                return send(component, () => component.call(method, ...args))
            },
        }
    },
}
