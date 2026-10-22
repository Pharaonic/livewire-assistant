import { assistantError } from './diagnostics.js'

/**
 * Livewire 4 connection.
 *
 * Livewire 4 exposes `window.Livewire` as a plain object and starts on
 * DOMContentLoaded. Documented hooks (`Livewire.hook`) drive discovery, and
 * message interceptors (`Livewire.interceptMessage`) follow each request. Two
 * internals are read because Livewire 4 offers no public API for them, and
 * both are confined to this file:
 *
 * - `Livewire.all()` returns component objects, and `component.ephemeral` is
 *   their client state, including deferred writes;
 * - `Livewire.initialRenderIsFinished`, to detect an already started Livewire.
 *
 * Livewire 4 settles `$set()` and `$call()` promises itself, but rejects them
 * when the action fails validation, while the request still succeeds. The
 * bridge keeps the contract of earlier lines: only a failed request rejects.
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
            // Livewire 4 follows requests through interceptors; Livewire 3 has none.
            && typeof instance.interceptMessage === 'function'
    },

    connect(win, events) {
        const livewire = win.Livewire
        const document = win.document
        const tracked = new WeakSet()
        // Operations waiting for their component: { resolve, reject, deferred?, carried? }.
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

        // Each operation settles once: with its request, or when its component goes away.
        const enqueue = (component, start) => new Promise((resolve, reject) => {
            const list = listOf(component)
            const operation = {
                resolve: (value) => list.delete(operation) && resolve(value),
                reject: (error) => list.delete(operation) && reject(error),
            }

            list.add(operation)
            start(operation)
        })

        // Validation errors arrive with a successful request, so they resolve like in earlier lines.
        const follow = (component, operation, promise, result) => promise.then(
            (value) => operation.resolve(result(value)),
            (failure) => (failure?.errors ? operation.resolve(undefined) : operation.reject(requestFailed(component))),
        )

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
        // Livewire reports every element it visits, changed or not; only real changes count.
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

        // Deferred writes travel with the next message of their component and settle with it.
        livewire.interceptMessage(({ message, onError, onFailure, onCancel, onFinish }) => {
            const component = message.component
            const carried = [...(waiting.get(component) ?? [])].filter((operation) => operation.deferred && !operation.carried)
            let failed = false

            carried.forEach((operation) => (operation.carried = true))
            onError(() => (failed = true))
            onFailure(() => (failed = true))
            onCancel(() => (failed = true))

            // A successful message finishes after the page was morphed.
            onFinish(() => {
                if (failed) {
                    carried.forEach((operation) => operation.reject(requestFailed(component)))

                    return
                }

                carried.forEach((operation) => operation.resolve(undefined))
                events.settled(component)
            })
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
                // Livewire 4 keeps the value as its state and later merges server data into it; the caller's value stays untouched.
                value = value === undefined ? undefined : JSON.parse(JSON.stringify(value))

                return enqueue(component, (operation) => {
                    if (live) {
                        follow(component, operation, component.$wire.$set(path, value, true), () => undefined)

                        return
                    }

                    operation.deferred = true
                    component.$wire.$set(path, value, false)
                })
            },

            call(component, method, args) {
                return enqueue(component, (operation) => {
                    follow(component, operation, component.$wire.$call(method, ...args), (value) => value ?? undefined)
                })
            },
        }
    },
}
