import type { RedoxStore } from '../redoxStore'
import {
  storeApi,
  DispatchOfModel,
  RedoxViews,
  AnyModel,
  ISelector,
} from '../types'

import validate from '../validate'

export default function getStoreApi<M extends AnyModel = AnyModel>(
  redoxStore: RedoxStore<M>,
  $state: () => M['state'],
  $actions: DispatchOfModel<M>,
  $views: RedoxViews<M['views']>,
  $createSelector: <TReturn>(
    selector: ISelector<M, TReturn>
  ) => (() => TReturn) & { clearCache: () => void }
): storeApi<M> {
  const store = {} as storeApi<M>
  store.$set = redoxStore.$set
  store.$patch = redoxStore.$patch
  store.$modify = redoxStore.$modify
  store.$actions = $actions
  store.$views = $views
  store.$createSelector = $createSelector
  Object.assign(store, $actions)
  Object.defineProperty(store, '$state', {
    enumerable: true,
    configurable: false,
    get() {
      return $state()
    },
    set() {
      if (process.env.NODE_ENV === 'development') {
        validate(() => [[true, `not allow set property '$state'`]])
      }
      return false
    },
  })
  const views = $views
  Object.keys(views).forEach((viewKey) => {
    Object.defineProperty(store, viewKey, {
      enumerable: true,
      get() {
        return views[viewKey].call()
      },
      set() {
        if (process.env.NODE_ENV === 'development') {
          validate(() => [
            [true, `not allow change view property '${viewKey}'`],
          ])
        }
        return false
      },
    })
  })
  return store
}
