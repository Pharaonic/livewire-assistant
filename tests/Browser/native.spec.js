import { expect, test } from '@playwright/test'
import { log, mounted, settle } from './helpers.js'

test.beforeEach(async ({ page }) => {
    await page.goto('/native')
    await mounted(page, 'native-input', 1)
})

test('works without jQuery or Select2 in the integration', async ({ page }) => {
    await expect(page.locator('#name')).toHaveValue('Ada')

    await page.fill('#name', 'Grace')
    await expect(page.locator('#name-value')).toHaveText('Grace')
})

test('updates a retained element after a server change instead of remounting it', async ({ page }) => {
    await page.click('#shout')
    await expect(page.locator('#name-value')).toHaveText('ADA')
    await expect(page.locator('#name')).toHaveValue('ADA')
    await settle(page)

    const state = await log(page)

    expect(state.mount['native-input']).toBe(1)
    expect(state.update['native-input']).toBe(1)
    expect(state.writes).toEqual([])
})

test('does not call update when nothing changed in the element', async ({ page }) => {
    await page.click('#refresh')
    await settle(page)

    expect((await log(page)).update['native-input'] ?? 0).toBe(0)
})

test('remounts when the options change', async ({ page }) => {
    const hint = () => page.evaluate(() => document.getElementById('name').mountedHint)

    expect(await hint()).toBe('one')

    await page.click('#change-hint')
    await expect.poll(hint).toBe('two')

    const state = await log(page)

    expect(state.mount['native-input']).toBe(2)
    expect(state.cleanup['native-input']).toBe(1)
    expect(state.listeners).toBe(1)
})

test('never accumulates listeners over many renders', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
        await page.click('#change-hint')
        await page.click('#shout')
    }

    await settle(page)

    const state = await log(page)

    expect(state.listeners).toBe(1)
    expect(state.mount['native-input'] - state.cleanup['native-input']).toBe(1)
})
