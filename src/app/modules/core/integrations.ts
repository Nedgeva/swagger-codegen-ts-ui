import { Json } from 'fp-ts/lib/Json'
import { ReadonlyRecord } from 'fp-ts/lib/ReadonlyRecord'
import { string, type } from 'io-ts'
import { AjaxConfig } from 'rxjs/ajax'
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js'
import { FileContentsRecord } from './core'
import { pipe } from 'fp-ts/lib/function'
import { readonlyArray, readonlyRecord } from 'fp-ts'

interface CodeSandboxContent {
	readonly content: Json
}

interface CodeSandboxPayload {
	readonly files: ReadonlyRecord<string, CodeSandboxContent>
}

export const addPackageJSONStuffToCodeSandbox = (
	filesRecord: Record<string, FileContentsRecord>,
): CodeSandboxPayload => ({
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

export const addPackageJSON = (
	filesRecord: Record<string, FileContentsRecord>,
	dateGenerated: Date,
): Record<string, FileContentsRecord> => ({
	...filesRecord,
	'package.json': {
		content: `{
  "dependencies": {
    "fp-ts": "latest",
    "io-ts": "latest",
    "io-ts-types": "latest",
    "monocle-ts": "latest",
    "newtype-ts": "latest",
    "typescript": "latest"
  },
  "name": "swagger-codegen-ts-ui-generated-code",
  "description": "Generated code from swagger-codegen-ts-ui at ${dateGenerated.toUTCString()}",
  "version": "1.0.0"
}`,
	},
})

export const zipFiles = async (filesContent: Record<string, FileContentsRecord>) => {
	const zipFileWriter = new BlobWriter()
	const zipWriter = new ZipWriter(zipFileWriter)

	const files = pipe(
		filesContent,
		readonlyRecord.toReadonlyArray,
		readonlyArray.map(([fileName, contents]) => zipWriter.add(fileName, new TextReader(contents.content))),
	)

	await Promise.all(files)

	return await zipWriter.close()
}
