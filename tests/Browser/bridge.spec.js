import { expect, test } from '@playwright/test'
import { errors, mounted } from './helpers.js'

/*
 * Exercises the component bridge with real Livewire 3 requests. The probe lives
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

test('set() defers a write until the next request and rejects invalid paths', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const code = (promise) => promise.then(() => 'resolved', (error) => error.code)
        const deferred = window.probe.component.set('country', '1', { live: false })
        const settled = { value: false }

        deferred.then(() => (settled.value = true))
        await new Promise((resolve) => setTimeout(resolve, 100))

        const before = { settled: settled.value, client: window.probe.component.get('country') }

        await window.probe.component.call('$refresh')

        return {
            before,
            after: await code(deferred),
            server: window.probe.component.get('country'),
            invalid: [await code(window.probe.component.set('', '1')), await code(window.probe.component.set(window.probe.property, '1'))],
        }
    })

    expect(result).toEqual({
        before: { settled: false, client: '1' },
        after: 'resolved',
        server: '1',
        invalid: ['invalid-property', 'invalid-property'],
    })
    await expect(page.locator('#country-value')).toHaveText('"1"')
})

test('call() resolves with the action result and preserves failures', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const nothing = await window.probe.component.call('setCountry', '3')
        const country = window.probe.component.get('country')
        const doubled = await window.probe.component.call('double', 21)
        const failure = await window.probe.component.call('fail').then(() => null, (error) => error.code)

        return { nothing: nothing === undefined, country, doubled, failure }
    })

    expect(result).toEqual({ nothing: true, country: '3', doubled: 42, failure: 'request-failed' })
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
