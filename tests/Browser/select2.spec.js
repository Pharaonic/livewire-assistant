import { expect, test } from '@playwright/test'
import { collectConsole, errors, log, mounted, pickSelect2, settle } from './helpers.js'

const value = (page, id) => page.locator(`#${id}-value`)
const widget = (page, id) => page.evaluate((selectId) => window.jQuery(`#${selectId}`).val(), id)
const rendered = (page, id) => page.locator(`#${id} + .select2 .select2-selection__rendered`)

// Our handlers only: Select2 keeps its own namespaced handlers on the element.
const ownHandlers = (page, id) => page.evaluate((selectId) => {
    const events = window.jQuery._data(document.getElementById(selectId), 'events') || {}

    return Object.values(events).flat().filter((handler) => handler.namespace === 'pharaonicAssistant').length
}, id)

test.beforeEach(async ({ page }) => {
    await page.goto('/select2')
    await mounted(page, 'select2', 3)
})

test('reflects the initial Livewire value', async ({ page }) => {
    expect(await widget(page, 'country')).toBe('2')
    await expect(rendered(page, 'country')).toContainText('Jordan')
    expect(await widget(page, 'tags')).toEqual(['a'])
    expect(await widget(page, 'size')).toBe('')
})

test('writes user changes to the bound property exactly once', async ({ page }) => {
    await pickSelect2(page, 'country', 'Egypt')
    await expect(value(page, 'country')).toHaveText('"1"')
    await settle(page)

    expect((await log(page)).writes).toEqual([['country', '1']])
    expect(await widget(page, 'country')).toBe('1')
})

test('applies server-originated values without echoing them back', async ({ page }) => {
    const cases = [
        ['set-null', 'null', ''],
        ['set-three', '"3"', '3'],
        ['set-zero', '0', '0'],
        ['set-empty', '""', ''],
    ]

    for (const [button, server, shown] of cases) {
        await page.click(`#${button}`)
        await expect(value(page, 'country')).toHaveText(server)
        await expect.poll(() => widget(page, 'country')).toBe(shown)
    }

    await settle(page)
    expect((await log(page)).writes).toEqual([])
})

test('selects "0" without losing it to truthiness', async ({ page }) => {
    await pickSelect2(page, 'country', 'Zero Land')
    await expect(value(page, 'country')).toHaveText('"0"')
    await settle(page)
    expect(await widget(page, 'country')).toBe('0')
})

test('synchronizes multiple selection both ways', async ({ page }) => {
    await pickSelect2(page, 'tags', 'B')
    await expect(value(page, 'tags')).toHaveText('["a","b"]')

    await page.click('#set-tags')
    await expect(value(page, 'tags')).toHaveText('["b","c"]')
    await expect.poll(() => widget(page, 'tags')).toEqual(['b', 'c'])

    await settle(page)
    expect((await log(page)).writes).toEqual([['tags', ['a', 'b']]])
})

test('binds a dot path', async ({ page }) => {
    await pickSelect2(page, 'size', 'Medium')
    await expect(value(page, 'size')).toHaveText('"m"')
})

test('keeps instances and handlers across repeated renders', async ({ page }) => {
    for (let render = 2; render <= 5; render++) {
        await page.click('#refresh')
        await expect(page.locator('#renders')).toHaveText(String(render))
    }

    await settle(page)

    const state = await log(page)

    expect(state.mount.select2).toBe(3)
    expect(state.cleanup.select2 ?? 0).toBe(0)
    expect(await ownHandlers(page, 'country')).toBe(1)
    await expect(page.locator('.select2-container')).toHaveCount(3)
})

test('cleans up removed elements and mounts them again when they return', async ({ page }) => {
    await page.click('#toggle')
    await expect(page.locator('#country')).toHaveCount(0)
    await expect.poll(async () => (await log(page)).cleanup.select2).toBe(1)
    await expect(page.locator('.select2-container')).toHaveCount(2)

    await page.click('#toggle')
    await mounted(page, 'select2', 4)
    expect(await widget(page, 'country')).toBe('2')
    expect(await ownHandlers(page, 'country')).toBe(1)
    await expect(page.locator('.select2-container')).toHaveCount(3)
})

test('destroy removes only integration-owned handlers before restoring the select', async ({ page }) => {
    await page.evaluate(() => {
        window.consumerChanges = 0
        window.jQuery('#tags').on('change.consumer', () => window.consumerChanges++)
        window.Pharaonic.assistant.destroy(document.getElementById('tags'))
    })

    expect(await ownHandlers(page, 'tags')).toBe(0)
    await expect(page.locator('#tags')).not.toHaveClass(/select2-hidden-accessible/)

    await page.evaluate(() => window.jQuery('#tags').trigger('change'))
    expect(await page.evaluate(() => window.consumerChanges)).toBe(1)

    await page.evaluate(() => window.Pharaonic.assistant.scan(document.getElementById('tags')))
    await mounted(page, 'select2', 4)
    expect(await ownHandlers(page, 'tags')).toBe(1)
})

test('does not log console errors during normal use', async ({ page }) => {
    const messages = collectConsole(page)

    await pickSelect2(page, 'country', 'Morocco')
    await page.click('#refresh')
    await settle(page)

    expect(messages.filter((message) => message.type === 'error' || message.type === 'pageerror')).toEqual([])
    expect(await errors(page)).toEqual([])
})
