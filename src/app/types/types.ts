export type GenericActionPayload<Action extends string, T = undefined> = T extends undefined
	? {
			readonly type: Action
	  }
	: {
			readonly type: Action
			readonly value: T
	  }
