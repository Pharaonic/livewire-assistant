import { expect, test } from '@playwright/test'
import { errors, mounted } from './helpers.js'

/*
 * Exercises the component bridge with real Livewire 1 requests. The probe lives
 * inside a wire:ignore region so morphing keeps it between requests.
 */
test.beforeEach(async ({ page }) => {
    await page.goto('/select2')
    await mounted(page, 'select2', 3)
    await page.evaluate(() => {
        window.Pharaonic.assistant.register('probe', {
            mount(context) {
                window.probe = context
                window.probeChanges = []

                return () => {
                    window.probeCleaned = true
                }
            },
        })

        const host = document.getElementById('tags').parentElement
        const probe = document.createElement('i')

        probe.setAttribute('data-pharaonic', 'probe')
        host.appendChild(probe)
        window.Pharaonic.assistant.scan(host)
    })
    await expect.poll(() => page.evaluate(() => window.probe !== undefined)).toBe(true)
})

test('reads client state synchronously, including dot paths', async ({ page }) => {
    const state = await page.evaluate(() => ({
        country: window.probe.component.get('country'),
        size: window.probe.component.get('filters.size'),
        missing: window.probe.component.get('filters.colour'),
        id: window.probe.component.id === document.querySelector('[wire\\:id]').getAttribute('wire:id'),
    }))

    expect(state).toEqual({ country: '2', size: null, id: true })
})

test('set() resolves after the round trip and get() then sees the server state', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const resolved = await window.probe.component.set('filters.size', 's')

        return { resolved: resolved === undefined, size: window.probe.component.get('filters.size') }
    })

    expect(result).toEqual({ resolved: true, size: 's' })
    await expect(page.locator('#size-value')).toHaveText('"s"')
})

test('set() rejects deferred writes and invalid paths', async ({ page }) => {
    const codes = await page.evaluate(async () => {
        const code = (promise) => promise.then(() => 'resolved', (error) => error.code)

        return [
            await code(window.probe.component.set('country', '1', { live: false })),
            await code(window.probe.component.set('', '1')),
            await code(window.probe.component.set(window.probe.property, '1')),
        ]
    })

    expect(codes).toEqual(['unsupported-operation', 'invalid-property', 'invalid-property'])
})

test('call() resolves after the action and preserves failures', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const value = await window.probe.component.call('setCountry', '3')
        const country = window.probe.component.get('country')
        const failure = await window.probe.component.call('fail').then(() => null, (error) => error.code)

        return { value: value === undefined, country, failure }
    })

    expect(result).toEqual({ value: true, country: '3', failure: 'request-failed' })
})

test('watch() reports server changes with the previous value until unsubscribed', async ({ page }) => {
    await page.evaluate(() => {
        window.unwatch = window.probe.component.watch('country', (value, previous) => window.probeChanges.push([value, previous]))
    })

    await page.click('#set-three')
    await expect.poll(() => page.evaluate(() => window.probeChanges)).toEqual([['3', '2']])

    await page.click('#refresh')
    await page.evaluate(() => window.unwatch())
    await page.click('#set-zero')
    await expect(page.locator('#country-value')).toHaveText('0')

    expect(await page.evaluate(() => window.probeChanges)).toEqual([['3', '2']])
})

test('a context is stale once its instance is destroyed', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const context = window.probe

        window.Pharaonic.assistant.destroy(context.element)

        let read = null

        try {
            context.component.get('country')
        } catch (error) {
            read = error.code
        }

        return {
            read,
            write: await context.component.set('country', '1').then(() => null, (error) => error.code),
            cleaned: window.probeCleaned,
        }
    })

    expect(result).toEqual({ read: 'stale-context', write: 'stale-context', cleaned: true })
    expect(await errors(page)).toEqual([])
})
