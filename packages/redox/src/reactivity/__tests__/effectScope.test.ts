import { reactive } from '../reactive'
import { effect } from '../effect'
import { view } from '../view'
import { EffectScope, onScopeDispose, getCurrentScope } from '../effectScope'

let oldEnv: any
beforeAll(() => {
  oldEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
})
afterAll(() => {
  process.env.NODE_ENV = oldEnv
})

describe('reactivity/effect/scope', () => {
  it('should run', () => {
    const fnSpy = jest.fn(() => {})
    new EffectScope().run(fnSpy)
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })

  it('should accept zero argument', () => {
    const scope = new EffectScope()
    expect(scope.effects.length).toBe(0)
  })

  it('should return run value', () => {
    expect(new EffectScope().run(() => 1)).toBe(1)
  })

  it('should collect the effects', () => {
    const scope = new EffectScope()
    scope.run(() => {
      let dummy
      const counter = reactive({ num: 0 })
      effect(() => (dummy = counter.num))

      expect(dummy).toBe(0)
    })

    expect(scope.effects.length).toBe(1)
  })

  it('stop', () => {
    let dummy: any
    let doubled: any
    const container: any = {
      value: { num: 0 },
    }
    container.$value = reactive(() => container.value)

    const scope = new EffectScope()
    scope.run(() => {
      dummy = view(() => container.$value.num)
      doubled = view(() => container.$value.num * 2)
    })

    expect(scope.effects.length).toBe(2)

    expect(dummy.value).toBe(0)
    container.value = { num: 7 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)
    expect(doubled.value).toBe(14)

    scope.stop()

    container.value = { num: 6 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)
    expect(doubled.value).toBe(14)
  })

  it('should collect nested scope', () => {
    let dummy: any
    let doubled: any
    let container: any = {
      value: { num: 0 },
    }
    container.$value = reactive(() => container.value)

    const scope = new EffectScope()
    scope.run(() => {
      dummy = view(() => container.$value.num)
      // nested scope
      new EffectScope().run(() => {
        doubled = view(() => container.$value.num * 2)
      })
    })

    expect(scope.effects.length).toBe(1)
    expect(scope.scopes!.length).toBe(1)
    expect(scope.scopes![0]).toBeInstanceOf(EffectScope)

    expect(dummy.value).toBe(0)
    container.value = { num: 7 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)
    expect(doubled.value).toBe(14)

    // stop the nested scope as well
    scope.stop()

    container.value = { num: 6 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)
    expect(doubled.value).toBe(14)
  })

  it('nested scope can be escaped', () => {
    let dummy: any
    let doubled: any
    let container: any = {
      value: { num: 0 },
    }
    container.$value = reactive(() => container.value)

    const scope = new EffectScope()
    scope.run(() => {
      dummy = view(() => container.$value.num)
      // nested scope
      new EffectScope(true).run(() => {
        doubled = view(() => container.$value.num * 2)
      })
    })

    expect(scope.effects.length).toBe(1)

    expect(dummy.value).toBe(0)
    container.value = { num: 7 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)
    expect(doubled.value).toBe(14)

    scope.stop()

    container.value = { num: 6 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)

    // nested scope should not be stopped
    expect(doubled.value).toBe(12)
  })

  it('able to run the scope', () => {
    let dummy: any
    let doubled: any
    let container: any = {
      value: { num: 0 },
    }
    container.$value = reactive(() => container.value)

    const scope = new EffectScope()
    scope.run(() => {
      dummy = view(() => container.$value.num)
    })

    expect(scope.effects.length).toBe(1)

    scope.run(() => {
      doubled = view(() => container.$value.num * 2)
    })

    expect(scope.effects.length).toBe(2)

    container.value = { num: 7 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)
    expect(doubled.value).toBe(14)

    scope.stop()
  })

  it('can not run an inactive scope', () => {
    let dummy: any
    let doubled: any
    let container: any = {
      value: { num: 0 },
    }
    container.$value = reactive(() => container.value)

    const scope = new EffectScope()
    scope.run(() => {
      dummy = view(() => container.$value.num)
    })

    expect(scope.effects.length).toBe(1)

    scope.stop()

    scope.run(() => {
      doubled = view(() => container.$value.num * 2)
    })

    expect('cannot run an inactive effect scope').toHaveBeenWarned()

    expect(scope.effects.length).toBe(1)

    container.value = { num: 7 }
    container.$value = reactive(() => container.value)
    expect(dummy.value).toBe(7)
    expect(doubled).toBe(undefined)
  })

  it('should fire onScopeDispose hook', () => {
    let dummy = 0

    const scope = new EffectScope()
    scope.run(() => {
      onScopeDispose(() => (dummy += 1))
      onScopeDispose(() => (dummy += 2))
    })

    scope.run(() => {
      onScopeDispose(() => (dummy += 4))
    })

    expect(dummy).toBe(0)

    scope.stop()
    expect(dummy).toBe(7)
  })

  it('should warn onScopeDispose() is called when there is no active effect scope', () => {
    const spy = jest.fn()
    const scope = new EffectScope()
    scope.run(() => {
      onScopeDispose(spy)
    })

    expect(spy).toHaveBeenCalledTimes(0)

    onScopeDispose(spy)

    expect(
      'onScopeDispose() is called when there is no active effect scope to be associated with.'
    ).toHaveBeenWarned()

    scope.stop()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should dereference child scope from parent scope after stopping child scope (no memleaks)', () => {
    const parent = new EffectScope()
    const child = parent.run(() => new EffectScope())!
    expect(parent.scopes!.includes(child)).toBe(true)
    child.stop()
    expect(parent.scopes!.includes(child)).toBe(false)
  })

  it('getCurrentScope() stays valid when running a detached nested EffectScope', () => {
    const parentScope = new EffectScope()

    parentScope.run(() => {
      const currentScope = getCurrentScope()
      expect(currentScope).toBeDefined()
      const detachedScope = new EffectScope(true)
      detachedScope.run(() => {})

      expect(getCurrentScope()).toBe(currentScope)
    })
  })
})
