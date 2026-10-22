import { assistantError, createReporter } from './diagnostics.js'

const SELECTOR = '[data-pharaonic]'
const NAME_PATTERN = /^[A-Za-z0-9][\w.:-]*$/
const PATH_PATTERN = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*$/

/**
 * Assistant runtime.
 *
 * Everything that touches Livewire lives in `livewire.js`, behind the
 * connection returned by `livewire.connect(window, events)`:
 *
 *   find(id)                     -> component | null
 *   ownerOf(element)             -> component | null (nearest owner)
 *   idOf(component)              -> string
 *   isAlive(component)           -> boolean
 *   get(component, path)         -> current client-side value
 *   set(component, path, value, { live }) -> Promise
 *   call(component, method, args)         -> Promise
 *
 * and reports framework activity through `events` (see `createEvents`).
 */
export function createRuntime({ window: win, livewire }) {
    const document = win.document
    const report = createReporter(win)

    const registrations = new Map()
    const records = new WeakMap()
    // Enumerable index of mounted elements for scoped teardown; teardown always removes the entry.
    const mounted = new Set()
    // Elements waiting for the component named by their data-component-id.
    const pending = new Set()
    // Elements whose current binding already failed; they are not retried until it changes.
    const skipped = new WeakMap()
    const warned = new Set()
    const watchers = new Map()

    const queuedRoots = new Set()
    const queuedChanges = new Set()
    const settled = new Set()

    let connection = null
    let ready = false
    let started = false
    let unsupported = false
    let flushQueued = false
    let retryPending = false

    // ---------------------------------------------------------------- public

    function register(name, definition) {
        if (typeof name !== 'string' || !NAME_PATTERN.test(name.trim())) {
            throw assistantError('invalid-registration', 'An integration name must be a non-empty string of letters, digits, ".", ":", "_" or "-".')
        }

        name = name.trim()

        if (typeof definition?.mount !== 'function' || (definition.update !== undefined && typeof definition.update !== 'function')) {
            throw assistantError('invalid-registration', `Integration "${name}" must be an object with a mount(context) function and an optional update(context) function.`)
        }

        const current = registrations.get(name)

        if (current) {
            if (current.definition === definition) {
                return current.unregister
            }

            throw assistantError('registration-conflict', `Integration "${name}" is already registered with a different definition.`)
        }

        const registration = { name, definition }

        registration.unregister = () => {
            if (registrations.get(name) === registration) {
                registrations.delete(name)
                teardownWhere((record) => record.registration === registration)
            }
        }

        registrations.set(name, registration)

        if (ready) {
            discover(document)
        }

        return registration.unregister
    }

    function start() {
        if (!started) {
            started = true
            connect()
        }
    }

    function scan(root = document) {
        if (ready) {
            discover(root)
        }
    }

    function destroy(root = document) {
        const inside = (element) => root === element || root.contains(element)

        teardownWhere((record) => inside(record.element))

        for (const element of [...pending]) {
            if (inside(element)) {
                pending.delete(element)
            }
        }

        for (const element of matches(root)) {
            skipped.delete(element)
        }
    }

    // ------------------------------------------------------------ connection

    function connect() {
        if (livewire.detect(win)) {
            connection = livewire.connect(win, createEvents())

            return
        }

        if (livewire.present(win)) {
            unsupported = true
            report('livewire-unsupported', 'The Livewire runtime on this page is not supported by this release of Pharaonic Livewire Assistant; it supports Livewire 4.')

            return
        }

        // Livewire may load after the Assistant: try again when it can be there.
        const retry = () => {
            if (!connection && !unsupported && livewire.present(win)) {
                connect()
            }
        }

        const giveUp = () => win.setTimeout(() => {
            retry()

            if (!connection && !unsupported) {
                report('livewire-missing', 'Livewire was not found on this page. Load Livewire\'s scripts before or with @livewireAssistantScripts.')
            }
        }, 0)

        document.addEventListener('DOMContentLoaded', retry, { once: true })
        document.addEventListener('livewire:load', retry, { once: true })

        if (document.readyState === 'complete') {
            giveUp()
        } else {
            win.addEventListener('load', giveUp, { once: true })
        }
    }

    function createEvents() {
        // Framework activity before Livewire is ready is covered by the first full scan.
        const whenReady = (handler) => (...args) => {
            if (ready) {
                handler(...args)
                schedule()
            }
        }

        return {
            ready() {
                ready = true
                queuedRoots.add(document)
                schedule()
            },
            added: whenReady((root) => queuedRoots.add(root)),
            componentAdded: whenReady(() => (retryPending = true)),
            changed: whenReady((node) => queuedChanges.add(node)),
            removed: whenReady(() => {}),
            settled: whenReady((component) => settled.add(component)),
            componentRemoved(component) {
                teardownWhere((record) => record.component === component)
                watchers.delete(component)
                settled.delete(component)
            },
            navigating() {
                destroy(document)
            },
            report,
        }
    }

    // ------------------------------------------------------------- lifecycle

    function schedule() {
        if (!flushQueued) {
            flushQueued = true
            queueMicrotask(flush)
        }
    }

    // Runs once after each Livewire update, when the DOM has settled.
    function flush() {
        flushQueued = false

        teardownWhere((record) => !record.element.isConnected)

        for (const element of [...pending]) {
            if (!element.isConnected) {
                pending.delete(element)
            }
        }

        // A change inside a mounted element counts as a change of that element.
        const changed = new Set()

        for (const node of queuedChanges) {
            for (let current = node; current; current = current.parentElement) {
                if (records.has(current)) {
                    changed.add(current)
                }
            }

            if (!records.has(node) && node.hasAttribute?.('data-pharaonic')) {
                queuedRoots.add(node)
            }
        }

        queuedChanges.clear()
        changed.forEach((element) => sync(element, true))

        const roots = [...queuedRoots]

        queuedRoots.clear()
        roots.forEach(discover)

        if (retryPending) {
            retryPending = false

            for (const element of [...pending]) {
                if (connection.find(readBinding(element).componentId)) {
                    skipped.delete(element)
                    sync(element)
                }
            }
        }

        const components = [...settled]

        settled.clear()
        components.forEach(notifyWatchers)
    }

    function discover(root) {
        if (root.isConnected !== false) {
            matches(root).forEach((element) => sync(element))
        }
    }

    /**
     * Bring one element in line with its markup: keep, update, remount, or mount it.
     * `changed` means Livewire changed the element, so a kept instance gets update().
     */
    function sync(element, changed = false) {
        const record = records.get(element)

        if (record) {
            if (!changed) {
                return
            }

            if (element.isConnected && isSameBinding(record, readBinding(element))) {
                runUpdate(record)

                return
            }

            teardown(element)
        }

        if (!element.isConnected) {
            return
        }

        const binding = readBinding(element)
        const registration = registrations.get(binding.name)

        if (!registration) {
            warnMissing(binding.name)

            return
        }

        const skip = skipped.get(element)

        if (skip?.registration === registration && skip.key === binding.key) {
            return
        }

        const fail = (code, message, details = {}) => {
            skipped.set(element, { registration, key: binding.key })
            report(code, message, { integration: binding.name, componentId: binding.componentId, element, ...details })
        }

        if (binding.options instanceof Error) {
            fail('invalid-options', `data-options of integration "${binding.name}" must be a JSON object.`, { cause: binding.options })

            return
        }

        const component = resolve(element, binding)

        if (!component) {
            if (binding.componentId === null) {
                fail('component-not-found', `The element of integration "${binding.name}" is not inside a Livewire component and has no data-component-id.`)
            } else {
                pending.add(element)
                fail('component-not-found', `No Livewire component has the id "${binding.componentId}" given by data-component-id. The element mounts if that component initializes later.`)
            }

            return
        }

        pending.delete(element)
        mount(element, registration, binding, component, fail)
    }

    function mount(element, registration, binding, component, fail) {
        const record = { element, registration, key: binding.key, component, disposers: [], destroyed: false }
        const details = { componentId: connection.idOf(component) }
        const reject = (code, message, cause) => {
            dispose(record)
            fail(code, message, { ...details, cause })
        }

        record.context = createContext(record, binding)

        let result

        try {
            result = registration.definition.mount(record.context)
        } catch (error) {
            reject('mount-failed', `Integration "${registration.name}" failed to mount.`, error)

            return
        }

        if (typeof result?.then === 'function') {
            reject('mount-async', `mount() of integration "${registration.name}" returned a promise; mount must be synchronous. The instance was not kept.`)

            return
        }

        if (result !== undefined && typeof result !== 'function') {
            reject('mount-failed', `mount() of integration "${registration.name}" must return a cleanup function or undefined.`)

            return
        }

        if (result) {
            record.disposers.push(result)
        }

        skipped.delete(element)
        records.set(element, record)
        mounted.add(element)
    }

    function runUpdate(record) {
        const { update } = record.registration.definition

        try {
            update?.call(record.registration.definition, record.context)
        } catch (error) {
            report('update-failed', `Integration "${record.registration.name}" failed to update.`, describe(record, error))
        }
    }

    function teardownWhere(predicate) {
        for (const element of [...mounted]) {
            if (predicate(records.get(element))) {
                teardown(element)
            }
        }
    }

    function teardown(element) {
        const record = records.get(element)

        pending.delete(element)

        if (record) {
            records.delete(element)
            mounted.delete(element)
            dispose(record)
        }
    }

    function dispose(record) {
        record.destroyed = true

        // Last in, first out: the cleanup returned by mount runs first.
        for (const disposer of record.disposers.splice(0).reverse()) {
            runDisposer(record, disposer)
        }
    }

    function runDisposer(record, disposer) {
        try {
            disposer()
        } catch (error) {
            report('cleanup-failed', `A cleanup callback of integration "${record.registration.name}" failed.`, describe(record, error))
        }
    }

    // --------------------------------------------------------------- context

    function createContext(record, binding) {
        const component = record.component
        const id = connection.idOf(component)

        const guard = () => {
            if (record.destroyed || !connection.isAlive(component)) {
                throw assistantError('stale-context', `The context of integration "${record.registration.name}" for component "${id}" is no longer active.`)
            }
        }

        // Validation errors of asynchronous methods become rejections, never throws.
        const promise = (operation) => new Promise((resolve) => resolve(operation()))

        const bridge = Object.freeze({
            id,
            get(path) {
                guard()
                assertPath(path)

                return copy(connection.get(component, path))
            },
            set(path, value, { live = true } = {}) {
                return promise(() => {
                    guard()
                    assertPath(path)

                    return connection.set(component, path, value, { live }).then(() => undefined)
                })
            },
            call(method, ...args) {
                return promise(() => {
                    guard()

                    return connection.call(component, method, args)
                })
            },
            watch(path, callback) {
                guard()
                assertPath(path)

                const value = connection.get(component, path)
                const watcher = { record, path, callback, value: copy(value), key: canonical(value) }
                const list = watchers.get(component) ?? new Set()

                list.add(watcher)
                watchers.set(component, list)

                const unsubscribe = once(() => list.delete(watcher))

                record.disposers.push(unsubscribe)

                return unsubscribe
            },
        })

        return Object.freeze({
            element: record.element,
            property: binding.property,
            options: binding.options,
            component: bridge,
            onCleanup(callback) {
                // A context outliving its instance cannot own anything new: release right away.
                if (record.destroyed) {
                    runDisposer(record, callback)
                } else {
                    record.disposers.push(once(callback))
                }
            },
        })
    }

    function notifyWatchers(component) {
        const list = watchers.get(component)

        if (!list || !connection.isAlive(component)) {
            return
        }

        for (const watcher of [...list]) {
            const value = connection.get(component, watcher.path)
            const key = canonical(value)

            if (!list.has(watcher) || key === watcher.key) {
                continue
            }

            const previous = watcher.value

            watcher.value = copy(value)
            watcher.key = key

            try {
                watcher.callback(copy(value), previous)
            } catch (error) {
                report('watcher-failed', `A watcher of integration "${watcher.record.registration.name}" on "${watcher.path}" failed.`, describe(watcher.record, error))
            }
        }
    }

    // --------------------------------------------------------------- helpers

    function readBinding(element) {
        const attribute = (name) => (element.getAttribute(name) ?? '').trim() || null
        const raw = element.getAttribute('data-options')
        const options = parseOptions(raw)
        const name = attribute('data-pharaonic') ?? ''
        const property = attribute('data-property')
        const componentId = attribute('data-component-id')
        const optionsKey = options instanceof Error ? `invalid:${raw}` : canonical(options)

        return { name, property, componentId, options, key: JSON.stringify([name, property, componentId, optionsKey]) }
    }

    function resolve(element, binding) {
        return binding.componentId === null ? connection.ownerOf(element) : connection.find(binding.componentId)
    }

    function isSameBinding(record, binding) {
        return binding.key === record.key
            && registrations.get(binding.name) === record.registration
            && resolve(record.element, binding) === record.component
    }

    function describe(record, cause) {
        return { integration: record.registration.name, componentId: connection.idOf(record.component), element: record.element, cause }
    }

    function warnMissing(name) {
        if (name !== '' && !warned.has(name)) {
            warned.add(name)
            win.console?.warn(`[Pharaonic Assistant] No integration is registered as "${name}"; its elements stay unmounted until it registers.`)
        }
    }

    function matches(root) {
        const found = root.nodeType === 1 && root.matches(SELECTOR) ? [root] : []

        return found.concat([...root.querySelectorAll(SELECTOR)])
    }

    return { register, start, scan, destroy, report }
}

export function assertPath(path) {
    if (typeof path !== 'string' || !PATH_PATTERN.test(path)) {
        throw assistantError('invalid-property', `"${String(path)}" is not a valid property path; use a property name or a dot path such as "address.city".`)
    }
}

export function parseOptions(raw) {
    if (raw === null || raw.trim() === '') {
        return {}
    }

    try {
        const parsed = JSON.parse(raw)

        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : new TypeError('data-options is not a JSON object.')
    } catch (error) {
        return error
    }
}

/**
 * JSON-value identity: object key order and whitespace do not matter.
 */
export function canonical(value) {
    if (value === undefined) {
        return 'undefined'
    }

    return JSON.stringify(value, (key, current) => {
        if (current === null || typeof current !== 'object' || Array.isArray(current)) {
            return current
        }

        return Object.fromEntries(Object.keys(current).sort().map((name) => [name, current[name]]))
    })
}

// Integrations get copies, so they can never change Livewire's state by accident.
function copy(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function once(callback) {
    let called = false

    return () => {
        if (!called) {
            called = true
            callback()
        }
    }
}
