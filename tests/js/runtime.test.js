import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonical } from '../../resources/js/runtime.js'
import { setup, spy, tick } from './helpers.js'

const widget = (attributes = '') => `<div wire:id="a"><input id="w" data-pharaonic="example" data-property="name" ${attributes}></div>`

describe('registration', () => {
    it('validates names and definitions', () => {
        const { runtime } = setup()

        for (const name of ['', '  ', 'two words', 5, null]) {
            assert.throws(() => runtime.register(name, { mount() {} }), { code: 'invalid-registration' })
        }

        assert.throws(() => runtime.register('example', {}), { code: 'invalid-registration' })
        assert.throws(() => runtime.register('example', { mount() {}, update: 1 }), { code: 'invalid-registration' })
    })

    it('accepts the same definition twice and rejects a different one', () => {
        const { runtime } = setup()
        const { definition } = spy()

        const first = runtime.register('example', definition)

        assert.equal(runtime.register(' example ', definition), first)
        assert.throws(() => runtime.register('example', spy().definition), { code: 'registration-conflict' })
    })

    it('mounts elements of an integration registered after startup', async () => {
        const lw = setup(widget())

        lw.component('a', { name: 'Ada' })
        await lw.ready()

        const { definition, calls } = spy()

        lw.runtime.register('example', definition)

        assert.equal(calls.mount.length, 1)
        assert.equal(calls.mount[0].element, lw.query('#w'))
    })

    it('unregisters idempotently, destroying only its own instances', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="one"></i><b data-pharaonic="two"></b></div>`)

        lw.component('a')

        const one = spy()
        const two = spy()
        const unregister = lw.runtime.register('one', one.definition)

        lw.runtime.register('two', two.definition)
        await lw.ready()

        unregister()
        unregister()

        assert.equal(one.calls.cleanup.length, 1)
        assert.equal(two.calls.cleanup.length, 0)

        // The name is free again.
        lw.runtime.register('one', spy().definition)
    })

    it('warns once per missing integration name', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="ghost"></i><b data-pharaonic="ghost"></b></div>`)

        lw.component('a')
        await lw.ready()
        lw.runtime.scan()

        assert.equal(lw.warnings.length, 1)
        assert.match(lw.warnings[0], /"ghost"/)
    })
})

describe('discovery', () => {
    it('includes the root itself and its descendants, without duplicates', async () => {
        const lw = setup(`<div wire:id="a" id="root" data-pharaonic="example"><i data-pharaonic="example"></i></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.runtime.scan(lw.query('#root'))
        lw.runtime.scan()

        assert.equal(calls.mount.length, 2)
    })

    it('does not mount before Livewire is ready', () => {
        const lw = setup(widget())
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        lw.runtime.start()
        lw.runtime.scan()

        assert.equal(calls.mount.length, 0)
    })

    it('mounts elements added by Livewire after the update settles', async () => {
        const lw = setup(`<div wire:id="a" id="root"></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.query('#root').innerHTML = '<i data-pharaonic="example"></i>'
        lw.events.added(lw.query('#root i'))
        assert.equal(calls.mount.length, 0)

        await tick()
        assert.equal(calls.mount.length, 1)
    })

    it('trims the integration name', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="  example "></i></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        assert.equal(calls.mount.length, 1)
    })
})

describe('component resolution', () => {
    it('binds to the nearest owner, never to the parent of a nested component', async () => {
        const lw = setup(`<div wire:id="parent"><i id="p" data-pharaonic="example"></i><div wire:id="child"><i id="c" data-pharaonic="example"></i></div></div>`)
        const { definition, calls } = spy()

        lw.component('parent')
        lw.component('child')
        lw.runtime.register('example', definition)
        await lw.ready()

        const byElement = new Map(calls.mount.map((context) => [context.element.id, context.component.id]))

        assert.deepEqual(Object.fromEntries(byElement), { p: 'parent', c: 'child' })
    })

    it('prefers an explicit component id', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="example" data-component-id="b"></i></div><div wire:id="b"></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.component('b')
        lw.runtime.register('example', definition)
        await lw.ready()

        assert.equal(calls.mount[0].component.id, 'b')
    })

    it('reports an unknown explicit id once, never falls back, and mounts when the component appears', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="example" data-component-id="late"></i></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()
        lw.runtime.scan()

        assert.equal(calls.mount.length, 0)
        assert.deepEqual(lw.errors.map((error) => error.code), ['component-not-found'])
        assert.equal(lw.errors[0].componentId, 'late')

        lw.component('late')
        lw.events.componentAdded()
        await tick()

        assert.equal(calls.mount[0].component.id, 'late')
    })

    it('reports an element outside any component without retrying', async () => {
        const lw = setup(`<i data-pharaonic="example"></i>`)
        const { definition, calls } = spy()

        lw.runtime.register('example', definition)
        await lw.ready()
        lw.runtime.scan()

        assert.equal(calls.mount.length, 0)
        assert.deepEqual(lw.errors.map((error) => error.code), ['component-not-found'])
    })
})

describe('options', () => {
    it('parses a JSON object', async () => {
        const lw = setup(widget(`data-options='{"tags": true, "max": 3}'`))
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        assert.deepEqual(calls.mount[0].options, { tags: true, max: 3 })
        assert.equal(calls.mount[0].property, 'name')
    })

    it('defaults to an empty object and a null property', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="example"></i></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        assert.deepEqual(calls.mount[0].options, {})
        assert.equal(calls.mount[0].property, null)
    })

    for (const value of ['{bad', '[1, 2]', 'null', '"text"', '{"code": alert(1)}']) {
        it(`rejects ${value} without evaluating it`, async () => {
            const lw = setup(widget(`data-options='${value}'`))
            const { definition, calls } = spy()

            lw.component('a')
            lw.runtime.register('example', definition)
            await lw.ready()
            lw.runtime.scan()

            assert.equal(calls.mount.length, 0)
            assert.deepEqual(lw.errors.map((error) => error.code), ['invalid-options'])
        })
    }

    it('compares options as JSON values', () => {
        assert.equal(canonical(JSON.parse('{"b": 1, "a": [1, {"d": 2, "c": 3}]}')), canonical({ a: [1, { c: 3, d: 2 }], b: 1 }))
        assert.notEqual(canonical({ a: [1, 2] }), canonical({ a: [2, 1] }))
    })
})

describe('updates and rebinding', () => {
    it('calls update once per settled change and keeps the instance', async () => {
        const lw = setup(widget())
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        const element = lw.query('#w')

        lw.events.changed(element)
        lw.events.changed(element)
        await tick()

        assert.equal(calls.mount.length, 1)
        assert.equal(calls.update.length, 1)
        assert.equal(calls.update[0], calls.mount[0])
    })

    it('updates the instance when a descendant changes', async () => {
        const lw = setup(`<div wire:id="a"><select id="w" data-pharaonic="example"><option id="o">1</option></select></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.events.changed(lw.query('#o'))
        await tick()

        assert.equal(calls.update.length, 1)
    })

    it('ignores whitespace and key order in options', async () => {
        const lw = setup(widget(`data-options='{"a":1,"b":2}'`))
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.query('#w').setAttribute('data-options', '{ "b": 2,  "a": 1 }')
        lw.events.changed(lw.query('#w'))
        await tick()

        assert.equal(calls.mount.length, 1)
        assert.equal(calls.update.length, 1)
    })

    for (const [attribute, value] of [['data-property', 'other'], ['data-options', '{"a":2}'], ['data-component-id', 'b'], ['data-pharaonic', 'second']]) {
        it(`remounts when ${attribute} changes`, async () => {
            const lw = setup(widget(`data-options='{"a":1}'`) + '<div wire:id="b"></div>')
            const { definition, calls } = spy()
            const second = spy()

            lw.component('a')
            lw.component('b')
            lw.runtime.register('example', definition)
            lw.runtime.register('second', second.definition)
            await lw.ready()

            lw.query('#w').setAttribute(attribute, value)
            lw.events.changed(lw.query('#w'))
            await tick()

            assert.equal(calls.cleanup.length, 1)
            assert.equal(calls.update.length, 0)
            assert.equal(calls.mount.length + second.calls.mount.length, 2)
        })
    }

    it('reports update failures and keeps the instance', async () => {
        const lw = setup(widget())
        const { definition, calls } = spy({ update() { throw new Error('boom') } })

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.events.changed(lw.query('#w'))
        await tick()

        assert.deepEqual(lw.errors.map((error) => error.code), ['update-failed'])
        assert.equal(calls.cleanup.length, 0)
    })
})

describe('teardown', () => {
    it('destroys removed elements but keeps moved ones', async () => {
        const lw = setup(`<div wire:id="a"><p id="x"><i id="w" data-pharaonic="example"></i></p><p id="y"></p><i id="gone" data-pharaonic="example"></i></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.query('#y').append(lw.query('#w'))
        lw.query('#gone').remove()
        lw.events.removed()
        await tick()

        assert.deepEqual(calls.cleanup.map((context) => context.element.id), ['gone'])
    })

    it('destroys a scoped root and allows remounting', async () => {
        const lw = setup(`<div wire:id="a" id="root">${'<i data-pharaonic="example"></i>'.repeat(3)}</div><div wire:id="b"><i data-pharaonic="example"></i></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.component('b')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.runtime.destroy(lw.query('#root'))
        lw.runtime.destroy(lw.query('#root'))
        assert.equal(calls.cleanup.length, 3)

        lw.runtime.scan(lw.query('#root'))
        assert.equal(calls.mount.length, 7)
    })

    it('runs every disposer once, last in first out, even when one throws', async () => {
        const lw = setup(widget())
        const order = []

        lw.component('a')
        lw.runtime.register('example', {
            mount(context) {
                context.onCleanup(() => order.push('first'))
                context.onCleanup(() => {
                    order.push('throws')
                    throw new Error('cleanup')
                })

                return () => order.push('returned')
            },
        })
        await lw.ready()

        lw.runtime.destroy()
        lw.runtime.destroy()

        assert.deepEqual(order, ['returned', 'throws', 'first'])
        assert.deepEqual(lw.errors.map((error) => error.code), ['cleanup-failed'])
    })

    it('runs registered cleanups of a failed mount and does not retry it', async () => {
        const lw = setup(widget())
        let cleaned = 0
        let mounts = 0

        lw.component('a')
        lw.runtime.register('example', {
            mount(context) {
                mounts++
                context.onCleanup(() => cleaned++)
                throw new Error('mount')
            },
        })
        await lw.ready()

        lw.runtime.scan()
        lw.events.changed(lw.query('#w'))
        await tick()

        assert.equal(mounts, 1)
        assert.equal(cleaned, 1)
        assert.deepEqual(lw.errors.map((error) => error.code), ['mount-failed'])

        // An explicit destroy clears the failure, so a later scan retries.
        lw.runtime.destroy()
        lw.runtime.scan()
        assert.equal(mounts, 2)
    })

    it('reports an asynchronous mount and does not keep it', async () => {
        const lw = setup(widget())
        let cleaned = 0

        lw.component('a')
        lw.runtime.register('example', {
            async mount(context) {
                context.onCleanup(() => cleaned++)
            },
        })
        await lw.ready()
        lw.runtime.scan()

        assert.deepEqual(lw.errors.map((error) => error.code), ['mount-async'])
        assert.equal(cleaned, 1)
    })

    it('rejects a mount result that is not a cleanup function', async () => {
        const lw = setup(widget())

        lw.component('a')
        lw.runtime.register('example', { mount: () => 'nope' })
        await lw.ready()

        assert.deepEqual(lw.errors.map((error) => error.code), ['mount-failed'])
    })

    it('isolates a failing integration from the others', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="broken"></i><b data-pharaonic="example"></b></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('broken', { mount() { throw new Error('x') } })
        lw.runtime.register('example', definition)
        await lw.ready()

        assert.equal(calls.mount.length, 1)
    })

    it('releases instances of a removed component and makes their contexts stale', async () => {
        const lw = setup(widget())
        const { definition, calls } = spy()
        const component = lw.component('a', { name: 'Ada' })

        lw.runtime.register('example', definition)
        await lw.ready()

        const context = calls.mount[0]

        lw.removeComponent(component)

        assert.equal(calls.cleanup.length, 1)
        assert.throws(() => context.component.get('name'), { code: 'stale-context' })
        await assert.rejects(context.component.set('name', 'x'), { code: 'stale-context' })
        await assert.rejects(context.component.call('save'), { code: 'stale-context' })
        assert.throws(() => context.component.watch('name', () => {}), { code: 'stale-context' })
    })

    it('rebinds to a replacement component with the same id', async () => {
        const lw = setup(widget())
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        const replacement = lw.component('a')

        lw.events.changed(lw.query('#w'))
        await tick()

        assert.equal(calls.cleanup.length, 1)
        assert.equal(calls.mount.length, 2)
        assert.throws(() => calls.mount[0].component.get('x'), { code: 'stale-context' })
        assert.equal(calls.mount[1].component.get('missing'), undefined)
        assert.ok(replacement)
    })

    it('runs onCleanup immediately once the instance is gone', async () => {
        const lw = setup(widget())
        const { definition, calls } = spy()
        let ran = 0

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()
        lw.runtime.destroy()

        calls.mount[0].onCleanup(() => ran++)
        assert.equal(ran, 1)
    })

    it('clears every instance before navigation', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="example"></i><i data-pharaonic="example"></i></div>`)
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        await lw.ready()

        lw.events.navigating()
        assert.equal(calls.cleanup.length, 2)

        lw.events.ready()
        await tick()
        assert.equal(calls.mount.length, 4)
    })
})

describe('component bridge', () => {
    async function mounted(data) {
        const lw = setup(widget())
        const { definition, calls } = spy()
        const component = lw.component('a', data)

        lw.runtime.register('example', definition)
        await lw.ready()

        return { lw, component, context: calls.mount[0], calls }
    }

    it('reads dot paths and returns copies', async () => {
        const { context, component } = await mounted({ address: { city: 'Cairo' }, tags: ['a'], zero: 0, empty: '', none: null })

        assert.equal(context.component.get('address.city'), 'Cairo')
        assert.equal(context.component.get('address.zip'), undefined)
        assert.equal(context.component.get('zero'), 0)
        assert.equal(context.component.get('empty'), '')
        assert.equal(context.component.get('none'), null)

        context.component.get('tags').push('b')
        assert.deepEqual(component.data.tags, ['a'])
    })

    for (const path of ['', ' ', '.name', 'name.', 'a..b', 'a b', null, undefined, 1]) {
        it(`rejects the property path ${JSON.stringify(path)}`, async () => {
            const { context } = await mounted({})

            assert.throws(() => context.component.get(path), { code: 'invalid-property' })
            await assert.rejects(context.component.set(path, 1), { code: 'invalid-property' })
            assert.throws(() => context.component.watch(path, () => {}), { code: 'invalid-property' })
        })
    }

    it('accepts numeric segments after the first', async () => {
        const { context } = await mounted({ items: [{ name: 'x' }] })

        assert.equal(context.component.get('items.0.name'), 'x')
    })

    it('resolves set after the request and passes the value unchanged', async () => {
        const { lw, context } = await mounted({})
        const promise = context.component.set('country_id', 0)

        assert.equal(lw.requests.length, 1)
        assert.equal(lw.requests[0].value, 0)
        lw.requests[0].resolve('ignored')
        assert.equal(await promise, undefined)
    })

    it('passes deferred writes to Livewire and resolves with their request', async () => {
        const { lw, context } = await mounted({})
        const live = context.component.set('name', 'x')
        const deferred = context.component.set('name', 'y', { live: false })

        assert.deepEqual(lw.requests.map((request) => request.live), [true, false])
        lw.requests[1].resolve()
        lw.requests[0].resolve()
        assert.equal(await deferred, undefined)
        assert.equal(await live, undefined)
    })

    it('returns action results and preserves rejections', async () => {
        const { lw, context } = await mounted({})
        const ok = context.component.call('save', 1, 'two')

        assert.deepEqual(lw.requests[0].args, [1, 'two'])
        lw.requests[0].resolve(42)
        assert.equal(await ok, 42)

        const failing = context.component.call('save')
        const failure = new Error('server')

        lw.requests[1].reject(failure)
        await assert.rejects(failing, failure)
    })

    it('watches changes with the previous value, without firing for equal values', async () => {
        const { lw, component, context } = await mounted({ name: 'Ada', tags: ['a'] })
        const seen = []

        context.component.watch('name', (value, previous) => seen.push([value, previous]))
        context.component.watch('tags', (value, previous) => seen.push([value, previous]))

        await lw.respond(component, { name: 'Ada', tags: ['a'] })
        await lw.respond(component, { name: 'Grace', tags: ['a', 'b'] })
        await lw.respond(component, { name: null, tags: ['a', 'b'] })

        assert.deepEqual(seen, [['Grace', 'Ada'], [['a', 'b'], ['a']], [null, 'Grace']])
    })

    it('stops a watcher on unsubscribe and on teardown', async () => {
        const { lw, component, context } = await mounted({ n: 1 })
        let first = 0
        let second = 0

        const unsubscribe = context.component.watch('n', () => first++)

        context.component.watch('n', () => second++)
        unsubscribe()
        unsubscribe()

        await lw.respond(component, { n: 2 })
        assert.deepEqual([first, second], [0, 1])

        lw.runtime.destroy()
        await lw.respond(component, { n: 3 })
        assert.deepEqual([first, second], [0, 1])
    })

    it('isolates a failing watcher', async () => {
        const { lw, component, context } = await mounted({ n: 1 })
        let calls = 0

        context.component.watch('n', () => {
            throw new Error('watcher')
        })
        context.component.watch('n', () => calls++)
        await lw.respond(component, { n: 2 })

        assert.equal(calls, 1)
        assert.deepEqual(lw.errors.map((error) => error.code), ['watcher-failed'])
    })

    it('freezes the context and bridge', async () => {
        const { context } = await mounted({})

        assert.ok(Object.isFrozen(context))
        assert.ok(Object.isFrozen(context.component))
    })

    it('reports errors without exposing values', async () => {
        const lw = setup(`<div wire:id="a"><i data-pharaonic="example" data-property="password"></i></div>`)

        lw.component('a', { password: 'secret-value' })
        lw.runtime.register('example', { mount: () => { throw new Error('x') } })
        await lw.ready()

        const detail = lw.errors[0]

        assert.deepEqual(Object.keys(detail).sort(), ['code', 'componentId', 'element', 'integration', 'message'])
        assert.doesNotMatch(detail.message, /secret-value/)
    })
})

describe('startup', () => {
    it('is idempotent', async () => {
        const lw = setup(widget())
        const { definition, calls } = spy()

        lw.component('a')
        lw.runtime.register('example', definition)
        lw.runtime.start()
        lw.runtime.start()
        lw.events.ready()
        lw.events.ready()
        await tick()

        assert.equal(calls.mount.length, 1)
    })
})
