import { assistantError } from './diagnostics.js'

/**
 * Livewire 3 connection.
 *
 * Livewire 3 exposes `window.Livewire` as a plain object and starts on
 * DOMContentLoaded. Documented hooks (`Livewire.hook`) drive discovery and
 * updates. Two internals are read because Livewire 3 offers no public API for
 * them, and both are confined to this file:
 *
 * - `Livewire.all()` returns component objects, and `component.ephemeral` is
 *   their client state, including deferred writes;
 * - `Livewire.initialRenderIsFinished`, to detect an already started Livewire.
 *
 * Livewire 3 never settles a `$set()` or `$call()` promise when its request
 * fails, so every write and call is bound to the next commit of its component
 * and rejected through that commit's `fail` callback.
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
            && typeof instance.all === 'function'
            && typeof instance.find === 'function'
            // Livewire 2 keeps a component store here; Livewire 4 adds request interceptors.
            && instance.components === undefined
            && instance.interceptMessage === undefined
    },

    connect(win, events) {
        const livewire = win.Livewire
        const document = win.document
        const tracked = new WeakSet()
        // Operations waiting for the next commit of their component: { resolve, reject, call?, commit? }.
        const waiting = new Map()

        const componentOf = (id) => livewire.find(id)?.__instance ?? null

        const track = (component) => {
            if (component && !tracked.has(component)) {
                tracked.add(component)
                component.addCleanup(() => {
                    rejectAll(component, () => assistantError('stale-context', `Component "${component.id}" was removed before its request finished.`))
                    events.componentRemoved(component)
                })
            }

            return component
        }

        const listOf = (component) => {
            let list = waiting.get(component)

            if (!list) {
                list = new Set()
                waiting.set(component, list)
            }

            return list
        }

        const rejectAll = (component, error) => {
            const list = waiting.get(component) ?? new Set()

            for (const operation of list) {
                operation.reject(error())
            }

            list.clear()
            waiting.delete(component)
        }

        const requestFailed = (component) => assistantError('request-failed', `The Livewire request of component "${component.id}" failed.`)

        // Each operation settles once: with its commit, or when its component goes away.
        const enqueue = (component, start) => new Promise((resolve, reject) => {
            const list = listOf(component)
            const operation = {
                resolve: (value) => list.delete(operation) && resolve(value),
                reject: (error) => list.delete(operation) && reject(error),
            }

            // A failed request settles nothing in Livewire 3; only this connection rejects it.

            list.add(operation)
            start(operation)
        })

        livewire.hook('component.init', ({ component }) => {
            track(component)
            events.componentAdded(component)
        })

        livewire.hook('element.init', ({ el }) => {
            if (el.hasAttribute?.('data-pharaonic')) {
                events.added(el)
            }
        })

        // Elements without wire: attributes get no element.init; morph.added covers everything Livewire inserts.
        livewire.hook('morph.added', ({ el }) => events.added(el))
        // Livewire 3 reports every element it visits, changed or not; only real changes count.
        const differing = new WeakSet()

        livewire.hook('morph.updating', ({ el, toEl }) => {
            if (!el.isEqualNode(toEl)) {
                differing.add(el)
            }
        })

        livewire.hook('morph.updated', ({ el }) => {
            if (differing.delete(el)) {
                events.changed(el)
            }
        })
        livewire.hook('morph.removed', ({ el }) => events.removed(el))

        livewire.hook('commit', ({ component, succeed, fail }) => {
            const carried = [...(waiting.get(component) ?? [])].filter((operation) => !operation.commit)

            carried.forEach((operation) => (operation.commit = true))

            succeed(() => {
                // A call resolves with its return value, which arrives a few microtasks later.
                carried.filter((operation) => !operation.call).forEach((operation) => operation.resolve(undefined))
                events.settled(component)
            })

            fail(() => carried.forEach((operation) => operation.reject(requestFailed(component))))
        })

        // wire:navigate swaps the page; widgets must leave the cached snapshot clean.
        document.addEventListener('livewire:navigating', () => events.navigating())
        document.addEventListener('livewire:navigated', () => events.ready())
        document.addEventListener('livewire:initialized', () => events.ready())

        if (livewire.initialRenderIsFinished || livewire.all().length > 0) {
            events.ready()
        }

        const find = (id) => track(componentOf(id))

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
                return componentOf(component.id) === component
            },

            get(component, path) {
                return path.split('.').reduce((carry, segment) => (carry === null || carry === undefined ? undefined : carry[segment]), component.ephemeral)
            },

            set(component, path, value, { live }) {
                return enqueue(component, () => component.$wire.$set(path, value, live))
            },

            call(component, method, args) {
                return enqueue(component, (operation) => {
                    operation.call = true
                    component.$wire.$call(method, ...args).then((value) => operation.resolve(value ?? undefined))
                })
            },
        }
    },
}
