export const ERROR_EVENT = 'pharaonic:assistant:error'

/**
 * Create an Error carrying a stable `code`, so callers can branch on it.
 */
export function assistantError(code, message, cause) {
    const error = new Error(`[Pharaonic Assistant] ${message}`, cause === undefined ? undefined : { cause })

    error.name = 'PharaonicAssistantError'
    error.code = code

    return error
}

/**
 * Error channel for failures that happen outside a direct caller, such as
 * automatic mounting. Every report is dispatched as a `pharaonic:assistant:error`
 * CustomEvent on `window` and written to the console. Reports never contain
 * property values or component state.
 */
export function createReporter(win) {
    return function report(code, message, { integration = null, componentId = null, element = null, cause } = {}) {
        const detail = { code, message, integration, componentId, element }

        try {
            win.dispatchEvent(new win.CustomEvent(ERROR_EVENT, { detail }))
        } finally {
            win.console?.error(`[Pharaonic Assistant] ${code}: ${message}`, ...(cause === undefined ? [] : [cause]))
        }
    }
}
