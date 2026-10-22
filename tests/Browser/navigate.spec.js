import { expect, test } from '@playwright/test'
import { errors, log, mounted, pickSelect2 } from './helpers.js'

const containers = (page) => page.locator('.select2-container')

test('releases and restores instances across visits, back, and forward', async ({ page }) => {
    await page.goto('/navigate-one')
    await mounted(page, 'select2', 3)

    for (let cycle = 1; cycle <= 3; cycle++) {
        await page.click('#next')
        await expect(page).toHaveURL(/navigate-two/)
        await mounted(page, 'native-input', cycle * 2 - 1)

        let state = await log(page)

        // Every Select2 instance of page one was released before the snapshot.
        expect(state.cleanup.select2).toBe(state.mount.select2)
        expect(state.listeners).toBe(1)

        await page.goBack()
        await expect(page).toHaveURL(/navigate-one/)
        await mounted(page, 'select2', cycle * 6)
        await expect(containers(page)).toHaveCount(3)

        state = await log(page)
        expect(state.mount['native-input'] - state.cleanup['native-input']).toBe(0)
        expect(state.listeners).toBe(0)

        await page.goForward()
        await expect(page).toHaveURL(/navigate-two/)
        await mounted(page, 'native-input', cycle * 2)

        await page.click('#previous')
        await expect(page).toHaveURL(/navigate-one/)
        await expect(containers(page)).toHaveCount(3)
    }

    // The restored page is fully functional.
    await pickSelect2(page, 'country', 'Egypt')
    await expect(page.locator('#country-value')).toHaveText('"1"')

    const state = await log(page)

    expect(state.mount.select2 - state.cleanup.select2).toBe(3)
    expect(await errors(page)).toEqual([])
})
