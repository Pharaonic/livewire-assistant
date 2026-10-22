import { expect, test } from '@playwright/test'
import { errors, log, mounted, pickSelect2, settle } from './helpers.js'

for (const order of ['livewire-first', 'assistant-first', 'late']) {
    for (const registration of ['queue', 'direct', 'late']) {
        test(`Assistant ${order}, integrations registered ${registration}`, async ({ page }) => {
            await page.goto(`/select2?order=${order}&registration=${registration}`)
            await mounted(page, 'select2', 3)

            await pickSelect2(page, 'country', 'Egypt')
            await expect(page.locator('#country-value')).toHaveText('"1"')
            await settle(page)

            const state = await log(page)

            expect(state.writes).toEqual([['country', '1']])
            expect(state.mount.select2).toBe(3)
            expect(await errors(page)).toEqual([])
        })
    }
}

test('the directive renders the runtime once per page', async ({ page }) => {
    await page.goto('/select2')
    await mounted(page, 'select2', 3)

    expect(await page.locator('script[src*="/pharaonic/livewire-assistant/assistant.js"]').count()).toBe(1)
})

test('including the runtime twice keeps a single runtime', async ({ page }) => {
    await page.goto('/select2?twice=1')
    await mounted(page, 'select2', 3)

    expect(await page.locator('script[src*="/pharaonic/livewire-assistant/assistant.js"]').count()).toBe(2)

    await pickSelect2(page, 'country', 'Egypt')
    await expect(page.locator('#country-value')).toHaveText('"1"')
    await page.click('#set-three')
    await expect.poll(() => page.evaluate(() => window.jQuery('#country').val())).toBe('3')
    await settle(page)

    const state = await log(page)

    expect(state.mount.select2).toBe(3)
    expect(state.writes).toEqual([['country', '1']])
    expect(state.watch.select2).toBe(2)
})

test('preserves existing Pharaonic globals', async ({ page }) => {
    await page.addInitScript(() => {
        window.Pharaonic = { legacy: true }
    })
    await page.goto('/select2')
    await mounted(page, 'select2', 3)

    expect(await page.evaluate(() => [window.Pharaonic.legacy, typeof window.Pharaonic.assistant.register])).toEqual([true, 'function'])
})

test('isolates a failing queued callback', async ({ page }) => {
    await page.addInitScript(() => {
        window.PharaonicAssistantQueue = [
            () => {
                throw new Error('broken integration')
            },
            () => {
                window.laterCallbackRan = true
            },
        ]
    })
    await page.goto('/select2')
    await mounted(page, 'select2', 3)

    expect(await page.evaluate(() => window.laterCallbackRan)).toBe(true)
    expect(await errors(page)).toEqual([{ code: 'queue-callback-failed', integration: null, componentId: null, hasElement: false }])
})

test('ESM and browser builds share one runtime', async ({ page }) => {
    await page.goto('/esm')
    await mounted(page, 'native-input', 1)
    await expect.poll(() => page.evaluate(() => window.esmExports !== undefined)).toBe(true)

    const result = await page.evaluate(() => {
        const definition = { mount: () => { window.esmMounts = (window.esmMounts || 0) + 1 } }

        window.esmExports.register('esm-probe', definition)

        let conflict = null

        try {
            window.Pharaonic.assistant.register('esm-probe', { mount() {} })
        } catch (error) {
            conflict = error.code
        }

        const host = document.querySelector('[wire\\:id]')
        const probe = document.createElement('i')

        probe.setAttribute('data-pharaonic', 'esm-probe')
        host.appendChild(probe)
        window.esmExports.scan(host)
        window.Pharaonic.assistant.scan(host)

        return { conflict, same: window.Pharaonic.assistant.register('esm-probe', definition) !== undefined, mounts: window.esmMounts }
    })

    expect(result).toEqual({ conflict: 'registration-conflict', same: true, mounts: 1 })
})

test('the browser build reuses a runtime installed by the ESM build', async ({ page }) => {
    await page.goto('/esm?order=none')
    await expect.poll(() => page.evaluate(() => window.browserBuildLoaded === true)).toBe(true)
    await mounted(page, 'native-input', 1)

    await page.fill('#name', 'Esm')
    await expect(page.locator('#name-value')).toHaveText('Esm')
    await settle(page)

    expect((await log(page)).listeners).toBe(1)
})

test('reports a missing Livewire', async ({ page }) => {
    await page.goto('/select2?livewire=none')
    await expect.poll(() => errors(page)).toEqual([{ code: 'livewire-missing', integration: null, componentId: null, hasElement: false }])
})

test('reports an unsupported Livewire', async ({ page }) => {
    await page.goto('/select2?livewire=fake')
    await expect.poll(() => errors(page)).toEqual([{ code: 'livewire-unsupported', integration: null, componentId: null, hasElement: false }])
    expect((await log(page)).mount.select2 ?? 0).toBe(0)
})
