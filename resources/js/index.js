import { livewire } from './livewire.js'
import { createRuntime } from './runtime.js'

/**
 * One runtime per page. The browser build and the ESM build both resolve to
 * the instance stored on `window.Pharaonic.assistant`, whichever loads first.
 */
function install(win) {
    const namespace = (win.Pharaonic ??= {})

    if (namespace.assistant) {
        return namespace.assistant
    }

    const runtime = createRuntime({ window: win, livewire })

    const assistant = Object.freeze({
        register: runtime.register,
        start: runtime.start,
        scan: runtime.scan,
        destroy: runtime.destroy,
    })

    namespace.assistant = assistant

    const run = (callback) => {
        try {
            if (typeof callback !== 'function') {
                throw new TypeError('Queued entries must be functions.')
            }

            callback(assistant)
        } catch (error) {
            runtime.report('queue-callback-failed', 'A queued Pharaonic Assistant registration callback failed.', { cause: error })
        }
    }

    const queued = win.PharaonicAssistantQueue

    // Later pushes run immediately, so integrations never race the runtime.
    win.PharaonicAssistantQueue = Object.freeze({
        push(...callbacks) {
            callbacks.forEach(run)

            return 0
        },
    })

    if (Array.isArray(queued)) {
        queued.splice(0).forEach(run)
    } else if (queued !== undefined) {
        runtime.report('queue-callback-failed', 'window.PharaonicAssistantQueue must be an array of functions.')
    }

    assistant.start()

    return assistant
}

const assistant = install(window)

export const register = (name, definition) => assistant.register(name, definition)
export const start = () => assistant.start()
export const scan = (root) => assistant.scan(root)
export const destroy = (root) => assistant.destroy(root)
