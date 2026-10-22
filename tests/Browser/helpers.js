import { expect } from '@playwright/test'

/**
 * Wait until the Assistant mounted `count` instances of `integration`.
 */
export async function mounted(page, integration, count) {
    await expect.poll(() => page.evaluate((name) => window.fixtureLog?.mount[name] ?? 0, integration)).toBe(count)
}

export const log = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.fixtureLog)))
export const errors = (page) => page.evaluate(() => window.fixtureErrors)

export async function pickSelect2(page, selectId, optionText) {
    await page.locator(`#${selectId} + .select2 .select2-selection`).click()
    await page.locator('.select2-results__option', { hasText: optionText }).click()
}

export async function settle(page) {
    // Livewire 1 debounces messages by 5ms; wait for the request and the morph.
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)))
}

export function collectConsole(page) {
    const messages = []

    page.on('console', (message) => messages.push({ type: message.type(), text: message.text() }))
    page.on('pageerror', (error) => messages.push({ type: 'pageerror', text: error.message }))

    return messages
}
