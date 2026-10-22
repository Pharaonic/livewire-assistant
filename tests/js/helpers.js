import { Window } from 'happy-dom'
import { createRuntime } from '../../resources/js/runtime.js'

export const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A runtime wired to an in-memory connection. Components are plain objects
 * keyed by the `wire:id` attribute of their root element.
 */
export function setup(html = '') {
    const win = new Window({ url: 'https://example.test/' })
    const errors = []
    const warnings = []

    win.console.error = () => {}
    win.console.warn = (message) => warnings.push(message)
    win.addEventListener('pharaonic:assistant:error', (event) => errors.push(event.detail))
    win.document.body.innerHTML = html

    const components = new Map()
    const requests = []
    let events = null

    const connection = {
        find: (id) => components.get(id) ?? null,
        ownerOf(element) {
            const root = element.closest('[wire\\:id]')

            return root ? components.get(root.getAttribute('wire:id')) ?? null : null
        },
        idOf: (component) => component.id,
        isAlive: (component) => components.get(component.id) === component,
        get: (component, path) => path.split('.').reduce((carry, key) => (carry == null ? undefined : carry[key]), component.data),
        set(component, path, value, { live }) {
            return new Promise((resolve, reject) => requests.push({ type: 'set', component, path, value, live, resolve, reject }))
        },
        call(component, method, args) {
            return new Promise((resolve, reject) => requests.push({ type: 'call', component, method, args, resolve, reject }))
        },
    }

    const livewire = {
        present: () => true,
        detect: () => true,
        connect(window, received) {
            events = received

            return connection
        },
    }

    const runtime = createRuntime({ window: win, livewire })

    const api = {
        win,
        document: win.document,
        runtime,
        errors,
        warnings,
        requests,
        get events() {
            return events
        },
        component(id, data = {}) {
            const component = { id, data }

            components.set(id, component)

            return component
        },
        removeComponent(component) {
            components.delete(component.id)
            events.componentRemoved(component)
        },
        // Simulate a server response that replaced the component state.
        async respond(component, data) {
            component.data = data
            events.settled(component)
            await tick()
        },
        async ready() {
            runtime.start()
            events.ready()
            await tick()
        },
        query: (selector) => win.document.querySelector(selector),
    }

    return api
}

/**
 * An integration definition that records every lifecycle call.
 */
export function spy(overrides = {}) {
    const calls = { mount: [], update: [], cleanup: [] }

    const definition = {
        mount(context) {
            calls.mount.push(context)

            return () => calls.cleanup.push(context)
        },
        update(context) {
            calls.update.push(context)
        },
        ...overrides,
    }

    return { definition, calls }
}
