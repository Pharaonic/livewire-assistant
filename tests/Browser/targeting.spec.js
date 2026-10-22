import { expect, test } from '@playwright/test'
import { errors, log, mounted, pickSelect2, settle } from './helpers.js'

test('binds each element to its nearest component, never a parent', async ({ page }) => {
    await page.goto('/nested')
    await mounted(page, 'select2', 2)

    expect(await page.evaluate(() => [window.jQuery('#parent-select').val(), window.jQuery('#child-select').val()])).toEqual(['1', '3'])

    await pickSelect2(page, 'child-select', 'Jordan')
    await expect(page.locator('#child-value')).toHaveText('2')
    await expect(page.locator('#parent-value')).toHaveText('1')

    await pickSelect2(page, 'parent-select', 'Morocco')
    await expect(page.locator('#parent-value')).toHaveText('3')
    await expect(page.locator('#child-value')).toHaveText('2')
})

test('releases a removed child component and mounts a new one', async ({ page }) => {
    await page.goto('/nested')
    await mounted(page, 'select2', 2)

    await page.click('#toggle-child')
    await expect(page.locator('#child')).toHaveCount(0)
    await expect.poll(async () => (await log(page)).cleanup.select2).toBe(1)

    await page.click('#toggle-child')
    await mounted(page, 'select2', 3)

    await pickSelect2(page, 'child-select', 'Egypt')
    await expect(page.locator('#child-value')).toHaveText('1')
    await expect(page.locator('#parent-value')).toHaveText('1')
    expect(await errors(page)).toEqual([])
})

test('an explicit component id wins over position', async ({ page }) => {
    await page.goto('/explicit')
    await mounted(page, 'native-input', 1)

    await page.evaluate(() => {
        const input = document.createElement('input')

        input.id = 'remote'
        input.setAttribute('data-pharaonic', 'native-input')
        input.setAttribute('data-property', 'name')
        input.setAttribute('data-component-id', document.querySelector('[wire\\:id]').getAttribute('wire:id'))
        document.getElementById('outside').appendChild(input)
        window.Pharaonic.assistant.scan(input)
    })

    await mounted(page, 'native-input', 2)
    await expect(page.locator('#remote')).toHaveValue('Ada')

    await page.fill('#remote', 'Remote')
    await expect(page.locator('#name-value')).toHaveText('Remote')
    await expect(page.locator('#name')).toHaveValue('Remote')
})

test('an unknown explicit id reports and never falls back', async ({ page }) => {
    await page.goto('/explicit')
    await mounted(page, 'native-input', 1)

    await page.evaluate(() => {
        const host = document.querySelector('[wire\\:id]')
        const input = document.createElement('input')

        input.setAttribute('data-pharaonic', 'native-input')
        input.setAttribute('data-component-id', 'does-not-exist')
        host.appendChild(input)
        window.Pharaonic.assistant.scan(host)
        window.Pharaonic.assistant.scan(host)
    })

    await settle(page)
    expect((await log(page)).mount['native-input']).toBe(1)
    expect(await errors(page)).toEqual([{ code: 'component-not-found', integration: 'native-input', componentId: 'does-not-exist', hasElement: true }])
})

test('an element outside every component is reported once', async ({ page }) => {
    await page.goto('/blank')
    await expect.poll(() => errors(page)).toEqual([{ code: 'component-not-found', integration: 'native-input', componentId: null, hasElement: true }])
})
