import useToasts, { ToastTypes } from '@geist-ui/core/esm/use-toasts/use-toast'
import { useObservable } from 'observable-hooks'
import { useSubscription } from 'observable-hooks/dist/cjs/use-subscription'
import { memo, useCallback, useMemo } from 'react'
import { Observable } from 'rxjs'

export interface NotificationEvent {
	readonly message: string
	readonly type: ToastTypes
}

export interface NotificationToastProps {
	readonly notificationToastValue: Observable<NotificationEvent>
}

export const NotificationToast = memo((props: NotificationToastProps) => {
	const { notificationToastValue } = props

	const { setToast } = useToasts()

	const setNotification = useCallback(
		(value: NotificationEvent) => setToast({ text: value.message, type: value.type }),
		[setToast],
	)

	useSubscription(notificationToastValue, setNotification)

	return null
})
