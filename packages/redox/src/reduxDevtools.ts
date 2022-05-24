import { IPlugin, ActionTypes } from './redoxStore'
import validate from './validate'

const reduxDevTools: IPlugin = function () {
	return {
		onStoreCreated(Store) {
			if (
				typeof window !== 'undefined' &&
				(window as any).__REDUX_DEVTOOLS_EXTENSION__
			) {
				const origDispatch = Store.dispatch
				const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__!.connect({
					name: Store.model.name,
				})

				const initialState = Store.$state()
				devTools.init(initialState)

				let isLatestState = true
				let latestState: any = Store.$state()
				devTools.subscribe((message: any) => {
					switch (message.type) {
						case 'ACTION':
							validate(() => [
								[
									typeof message.payload !== 'string',
									'Unsupported action format',
								],
							])
							try {
								const action = JSON.parse(message.payload)
								if (action.type === ActionTypes.SET) {
									return Store.$set(action.state)
								}
								return Store.dispatch(action)
							} catch (e) {
								return validate(() => [
									[true, `Could not parse the received json.`],
								])
							}

						case 'DISPATCH':
							switch (message.payload.type) {
								case 'RESET':
									Store.$set(initialState)
									return devTools.init(Store.$state())

								case 'COMMIT':
									return devTools.init(Store.$state())

								case 'ROLLBACK':
									try {
										const parsedState = JSON.parse(message.state)
										Store.$set(parsedState, true)
										return devTools.init(Store.$state())
									} catch (e) {
										return validate(() => [
											[true, 'Could not parse the received json'],
										])
									}

								case 'JUMP_TO_STATE':
								case 'JUMP_TO_ACTION':
									try {
										const parsedState = JSON.parse(message.state)
										if (
											JSON.stringify(parsedState) ===
											JSON.stringify(latestState)
										) {
											isLatestState = true
										} else if (isLatestState) {
											isLatestState = false
											latestState = Store.$state()
										}
										return Store.$set(parsedState, true)
									} catch (e) {
										return validate(() => [
											[true, 'Could not parse the received json'],
										])
									}
							}
							return
					}
				})

				const dispatch = function (action: any) {
					let res
					let state
					if (isLatestState || action.payload?.setFromDevtools) {
						res = origDispatch(action)
						state = Store.$state()
					} else {
						res = action
						state = Store.getCurrentReducer()(latestState, action)
						latestState = state
					}
					if (!action.payload?.setFromDevtools) {
						devTools.send(action, state)
					}
					return res
				}

				Store.dispatch = dispatch
			}
		},
	}
}

export default reduxDevTools
