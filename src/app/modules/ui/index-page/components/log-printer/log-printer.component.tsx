import { Button, Fieldset, Snippet } from '@geist-ui/core'
import { isNonEmpty } from 'fp-ts/lib/ReadonlyArray'
import { useSubscription } from 'observable-hooks'
import * as React from 'react'
import { memo } from 'react'
import { Observable } from 'rxjs'

export interface LogPrinterProps {
	readonly eventLog: Observable<string>
}

export const LogPrinter = memo((props: LogPrinterProps) => {
	const [messageLog, setLog] = React.useState<string[]>([])

	useSubscription(props.eventLog, (message) => setLog((log) => [message, ...log]))

	const handleClear = React.useCallback(() => setLog([]), [])

	return (
		<Fieldset width="100%">
			<Fieldset.Subtitle>
				<Snippet copy="prevent" text={messageLog} width="100%" />
			</Fieldset.Subtitle>
			<Fieldset.Footer>
				Console output
				{isNonEmpty(messageLog) && (
					<Button auto scale={1 / 3} font="12px" onClick={handleClear}>
						Clear log
					</Button>
				)}
			</Fieldset.Footer>
		</Fieldset>
	)
})
