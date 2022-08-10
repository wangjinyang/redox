import type {
  RedoxStore,
  ModelInstance,
  AnyModel,
  ISelector,
  ISelectorParams,
} from '@shuvi/redox'

function tuplify<T extends any[]>(...elements: T) {
  return elements
}

function updateProxy<IModel extends AnyModel>(store: ModelInstance<IModel>) {
  const tempProxy = { $state: store.$state } as ISelectorParams<IModel>
  Object.assign(tempProxy, store.$state, store.$views)
  ;(
    store as ModelInstance<IModel> & {
      __proxy: ISelectorParams<IModel>
    }
  ).__proxy = new Proxy(tempProxy, {
    get(target: any, p: string | symbol): any {
      let result = target[p]

      // OwnProperty function should be $state and view
      if (typeof result === 'function' && target.hasOwnProperty(p)) {
        const view = result
        // call view fn
        let res = view()
        // cache view result
        target[p] = res
        return res
      }

      return result
    },
    set() {
      if (process.env.NODE_ENV === 'development') {
        console.error(`not allow change any thing !`)
      }
      return false
    },
  })
}

function getStateActions<
  IModel extends AnyModel,
  Selector extends ISelector<IModel>
>(
  model: IModel,
  redoxStore: RedoxStore,
  selector?: () => ReturnType<Selector>
) {
  const store = redoxStore.getModel(model)
  let state: ISelectorParams<IModel> | ReturnType<Selector>
  if (!selector) {
    if (!store.__proxy) {
      updateProxy(store)
      redoxStore.subscribe(model, function () {
        updateProxy(store)
      })
    }
    state = store.__proxy as ISelectorParams<IModel>
  } else {
    state = selector()
  }
  return tuplify(state, store.$actions)
}

export { getStateActions }
