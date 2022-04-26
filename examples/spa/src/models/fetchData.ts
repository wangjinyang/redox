import { defineModel } from '@shuvi/redox'
import { loading } from './baseModels/loading'
import { delay } from './utils'

// loading is part of the fetchA and fetchB, use depend to compose

export const fetchA = defineModel(
	{
		name: 'fetchA',
		state: {
			data: [] as string[],
		},
		reducers: {
			setData: (state, payload: string[] = []) => {
				state.data = payload
			},
		},
		effects: {
			fetchAData(arg: string) {
				this.$dep.loading.isLoading()
				delay(200)
				this.setData([arg])
				this.$dep.loading.notLoading()
			},
		},
		views: {
			isLoading(_, dependState) {
				return dependState.loading.isLoading
			},
		},
	},
	[loading]
)

export const fetchB = defineModel(
	{
		name: 'fetchB',
		state: {
			data: [] as number[],
		},
		reducers: {
			setData: (state, payload: number[] = []) => {
				state.data = payload
			},
		},
		effects: {
			fetchBData(arg: number) {
				this.$dep.loading.isLoading()
				delay(200)
				this.setData([arg])
				this.$dep.loading.notLoading()
			},
		},
		views: {
			isLoading(_, dependState) {
				return dependState.loading.isLoading
			},
		},
	},
	[loading]
)
