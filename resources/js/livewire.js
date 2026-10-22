import { assistantError } from './diagnostics.js'

/**
 * Livewire 2 connection.
 *
 * `@livewireScripts` replaces the `window.Livewire` class with the page
 * instance before the page loads. Documented hooks (`Livewire.hook`) drive
 * discovery and updates. Three internals are read because Livewire 2 offers
 * no public API for them, and all are confined to this file:
 *
 * - `Livewire.components.componentsById` and `initialRenderIsFinished`, to
 *   find components, detect replaced ones, and detect an already started Livewire;
 * - `component.data` and `component.deferredActions`, to read client state
 *   including writes that wait for the next request;
 * - `message.updateQueue`, to settle a deferred write with the request that carried it.
 */
export const livewire = {
    present(win) {
        return win.livewire !== undefined || win.Livewire !== undefined
    },

    detect(win) {
        const instance = win.Livewire

        return instance !== null
            && typeof instance === 'object'
            && typeof instance.hook === 'function'
            && typeof instance.components?.componentsById === 'object'
            && typeof instance.components?.hooks?.availableHooks?.includes === 'function'
            && instance.components.hooks.availableHooks.includes('message.processed')
    },

    connect(win, events) {
        const livewire = win.Livewire
        const store = livewire.components
        const document = win.document
        const tracked = new WeakSet()
        // Promises waiting for a request, per component: { resolve, reject, message? }.
        const deferred = new Map()

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

        const pendingOf = (component) => {
            let list = deferred.get(component)

            if (!list) {
                list = new Set()
                deferred.set(component, list)
            }

            return list
        }

        const rejectAll = (component, error) => {
            const list = deferred.get(component) ?? new Set()

            for (const operation of list) {
                operation.reject(error())
            }

            // Cleared, so a request that still answers later settles nothing twice.
            list.clear()
            deferred.delete(component)
        }

        // Livewire rejects with nothing useful; callers get a coded error instead.
        const requestFailed = (component) => assistantError('request-failed', `The Livewire request of component "${component.id}" failed.`)

        // A live write or call: Livewire's own promise settles with the request.
        const send = (component, method, params) => new Promise((resolve, reject) => {
            const operation = { resolve, reject }
            const list = pendingOf(component)

            list.add(operation)
            component.call(method, ...params).then(
                (value) => list.delete(operation) && resolve(value),
                () => list.delete(operation) && reject(requestFailed(component)),
            )
        })

        livewire.hook('component.initialized', (component) => {
            track(component)
            events.componentAdded(component)
        })

        livewire.hook('element.initialized', (element) => {
            if (element.hasAttribute?.('data-pharaonic')) {
                events.added(element)
            }
        })

        livewire.hook('element.updated', (element) => events.changed(element))
        livewire.hook('element.removed', (element) => events.removed(element))

        // Livewire sends every waiting deferred write with the next request of the component.
        livewire.hook('message.sent', (message, component) => {
            for (const operation of deferred.get(component) ?? []) {
                if (operation.deferred && !operation.message) {
                    operation.message = message
                }
            }
        })

        const finish = (message, component, outcome) => {
            const list = deferred.get(component)

            for (const operation of [...(list ?? [])]) {
                if (operation.message === message) {
                    list.delete(operation)
                    outcome(operation)
                }
            }
        }

        livewire.hook('message.processed', (message, component) => {
            finish(message, component, (operation) => operation.resolve(undefined))
            events.settled(component)
        })

        livewire.hook('message.failed', (message, component) => {
            finish(message, component, (operation) => operation.reject(requestFailed(component)))
        })

        // Widgets must leave the cached snapshot clean before a Turbolinks or Turbo visit.
        document.addEventListener('turbolinks:before-cache', () => events.navigating())
        document.addEventListener('turbo:before-cache', () => events.navigating())
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

            // A deferred write is part of the client state until it is sent.
            get(component, path) {
                const waiting = component.deferredActions?.[path]

                if (waiting) {
                    return waiting.payload.value
                }

                return path.split('.').reduce((carry, segment) => (carry === null || carry === undefined ? undefined : carry[segment]), component.data)
            },

            set(component, path, value, { live }) {
                if (live) {
                    return send(component, '$set', [path, value]).then(() => undefined)
                }

                return new Promise((resolve, reject) => {
                    pendingOf(component).add({ deferred: true, resolve, reject })
                    component.set(path, value, true)
                })
            },

            call(component, method, args) {
                return send(component, method, args).then((value) => value ?? undefined)
            },
        }
    },
}
