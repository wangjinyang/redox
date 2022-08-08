import { Action, RedoxDispatcher, AnyModel, DispatchOfModel } from '../types'
import type { RedoxStore } from '../redoxStore'

const createReducer = <IModel extends AnyModel>(
  store: RedoxStore<IModel>,
  actionName: string
): RedoxDispatcher<boolean> => {
  return (payload?: any): Action => {
    const action: Action = { type: actionName }

    if (typeof payload !== 'undefined') {
      action.payload = payload
    }
    return store.dispatch(action)
  }
}

/**
 * Creates a dispatcher object for a model - it contains a mapping from all
 * reducers to functions which dispatch their corresponding actions.
 */
export const createReducers = <IModel extends AnyModel>(
  $actions: DispatchOfModel<IModel>,
  redoxStore: RedoxStore<IModel>
): void => {
  // map reducer names to dispatch actions
  const reducers = redoxStore.model.reducers

  if (!reducers) {
    return
  }

  const reducersKeys = Object.keys(reducers)
  reducersKeys.forEach((reducerName) => {
    // @ts-ignore
    $actions[reducerName] = createReducer(redoxStore, reducerName)
  })
}
