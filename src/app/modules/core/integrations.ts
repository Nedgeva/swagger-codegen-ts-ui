import { Json } from 'fp-ts/lib/Json'
import { ReadonlyRecord } from 'fp-ts/lib/ReadonlyRecord'
import { string, type } from 'io-ts'
import { AjaxConfig } from 'rxjs/ajax'
import { FileContentsRecord } from './core'

interface CodeSandboxContent {
	readonly content: Json
}

interface CodeSandboxPayload {
	readonly files: ReadonlyRecord<string, CodeSandboxContent>
}

export const addPackageJSONStuff = (filesRecord: Record<string, FileContentsRecord>): CodeSandboxPayload => ({
	files: {
		...filesRecord,
		'package.json': {
			content: {
				dependencies: {
					typescript: 'latest',
					'monocle-ts': 'latest',
					'newtype-ts': 'latest',
					'io-ts': 'latest',
					'fp-ts': 'latest',
					'io-ts-types': 'latest',
				},
			},
		},
	},
})

export const getCodeSandboxAjaxConfig = (v: CodeSandboxPayload): AjaxConfig => ({
	url: 'https://codesandbox.io/api/v1/sandboxes/define?json=1',
	method: 'POST',
	crossDomain: true,
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	},
	body: JSON.stringify(v),
})

export const codeSandboxResponseCodec = type({ sandbox_id: string })

export const getCodeSandboxURLToOpen = (sandboxId: string) => `https://codesandbox.io/s/${sandboxId}`
