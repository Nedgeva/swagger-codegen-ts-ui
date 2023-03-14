import { Code, Fieldset } from '@geist-ui/core'
import { useObservableState } from 'observable-hooks'
import * as React from 'react'
import { memo } from 'react'
import { Observable } from 'rxjs'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeViewerValue {
	readonly code: string
	readonly filePath: string
}

export interface CodeViewerProps {
	readonly codeViewerValue: Observable<CodeViewerValue | undefined>
}

const getLanguageFromExtension = (filePath: string) => {
	const yamlExt = ['yaml', 'yml']

	if (yamlExt.some((ext) => filePath.endsWith(`.${ext}`))) return 'yaml'

	return 'typescript'
}

export const CodeViewer = memo((props: CodeViewerProps) => {
	const value = useObservableState(props.codeViewerValue)

	return (
		<Fieldset width="100%">
			<Fieldset.Subtitle>
				{value && (
					<Code block name={value.filePath} my={0} className="codeblock">
						<SyntaxHighlighter
							style={dark}
							customStyle={{ maxHeight: 247 }}
							language={getLanguageFromExtension(value.filePath)}>
							{value.code}
						</SyntaxHighlighter>
					</Code>
				)}
			</Fieldset.Subtitle>
			<Fieldset.Footer>File contents viewer</Fieldset.Footer>
		</Fieldset>
	)
})
