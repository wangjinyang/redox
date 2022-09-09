import { warn } from '../warning'
import { hasChanged, isObject, hasOwn } from '../utils'
import { TrackOpTypes } from './operations'
import { ReactiveEffect, trackView } from './effect'
import { ReactiveFlags, toRaw, toCompanion } from './reactive'

export interface View<T = any> {
  readonly value: T
  readonly effect: ReactiveEffect<T>
}

export type ViewGetter<T> = (...args: any[]) => T

export type onViewInvalidate = (fn: () => void) => () => void

export class ViewImpl<T> {
  public readonly effect: ReactiveEffect<T>

  public readonly [ReactiveFlags.IS_READONLY]: boolean = true

  private _value!: T

  private _cacheable: boolean

  private _dirty = true

  constructor(
    getter: ViewGetter<T>,
    onInvalidate?: onViewInvalidate,
    disableCache?: boolean
  ) {
    this.effect = new ReactiveEffect(getter)
    this.effect.view = this
    this.effect.active = this._cacheable = !disableCache

    if (onInvalidate) {
      const unSubscribe = onInvalidate(() => {
        this._dirty = true
      })
      this.effect.onStop = () => {
        unSubscribe()
      }
    }
  }

  get value() {
    // the view may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this)
    if (!self._cacheable) {
      self._value = self.effect.run()!
    } else if (self._dirty) {
      if (!self._validateCache()) {
        self._dirty = false
        self._value = self.effect.run()!
      }
    }
    trackView(self, self._value)
    return self._value
  }

  set value(_newValue: T) {
    if (process.env.NODE_ENV === 'development') {
      warn('Write operation failed: computed value is readonly')
    }
  }

  private _validateCache(): boolean {
    // return false for the first run and switch to real func for the rest calls
    this._validateCache = this.__validateCache
    return false
  }

  private __validateCache(): boolean {
    const { targetMap, views } = this.effect
    if (targetMap.size <= 0 && views.size <= 0) {
      return true
    }

    for (const [view, value] of this.effect.views.entries()) {
      if (hasChanged(view.value, value)) {
        return false
      }
    }

    const queue: any[] = [...targetMap.keys()]
    while (queue.length) {
      const target = queue.shift()!
      const accessRecord = targetMap.get(target)
      if (!accessRecord) {
        continue
      }

      const compaion = toCompanion(target) || {}
      for (let [key, { type, value }] of accessRecord.record.entries()) {
        if (type === TrackOpTypes.HAS) {
          if (hasOwn(compaion, key as any) !== value) {
            return false
          }
        } else if (hasChanged(compaion[key as any], value)) {
          return false
        }

        if (isObject(value)) {
          queue.push(accessRecord.record.get(value))
        }
      }
    }

    return true
  }
}

export function view<T>(
  getter: ViewGetter<T>,
  onInvalidate?: onViewInvalidate,
  disableCache: boolean = false
): View<T> {
  const cRef = new ViewImpl<T>(getter, onInvalidate, disableCache)
  return cRef
}
