import * as path from 'path'
import { generate } from '@devexperts/swagger-codegen-ts/dist'
import { serialize as serializeOpenAPI } from '@devexperts/swagger-codegen-ts/dist/language/typescript/3.0'
import { OpenapiObjectCodec } from '@devexperts/swagger-codegen-ts/dist/schema/3.0/openapi-object'
import { filter, from, identity, map, merge, of, share, Subject, switchMap, tap, withLatestFrom } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { renderUI } from './modules/ui/app.ui'
import { IndexPageProps } from './modules/ui/index-page/index-page.component'
import { constVoid, flow, pipe } from 'fp-ts/lib/function'
import { mergeMap } from 'rxjs'
import { SpecFile } from './modules/ui/index-page/components/spec-add/spec-add.component'
import {
	FileClickPayload,
	FileTreeActionPayload,
	PurgeBtnClickPayload,
} from './modules/ui/index-page/components/file-tree/file-tree.component'
import { either, string } from 'fp-ts'
import {
	getConsoleLogPatcher,
	installAndConfigureBFS,
	queryFS,
	readDumpedFilesToRecord,
	readFile,
	rmDirContent,
	writeFile,
} from './modules/core/core'
import {
	addPackageJSONStuff,
	codeSandboxResponseCodec,
	getCodeSandboxAjaxConfig,
	getCodeSandboxURLToOpen,
} from './modules/core/integrations'

const ROOT_DIR = '/tmp'

installAndConfigureBFS(ROOT_DIR)

const stripPathExtraPrefix = (filePath: string) =>
	filePath.replace(new RegExp(`^${ROOT_DIR}/`), string.empty).replace(new RegExp('^(/?)generated/'), string.empty)

const generateCodeFromSpec = (specFileName: string) =>
	generate({
		cwd: '/tmp',
		out: '/tmp/generated',
		spec: `./${specFileName}`,
		decoder: OpenapiObjectCodec,
		language: serializeOpenAPI,
	})()

export const app = async () => {
	const spec = new Subject<SpecFile[]>()
	const eventMessage = new Subject<string>()
	const fsActions = new Subject<FileTreeActionPayload>()
	const notifyFSQuery = new Subject()

	const { patch: patchConsoleLog, unpatch: unpatchConsoleLog } = getConsoleLogPatcher((v) => eventMessage.next(v))

	const specAddEffect = pipe(
		spec.asObservable(),
		tap(patchConsoleLog),
		switchMap((xs) => from(xs)),
		mergeMap((specFile) =>
			pipe(
				writeFile(path.join(ROOT_DIR, specFile.name), specFile.contents),
				from,
				map(() => specFile.name),
			),
		),
		switchMap(flow(generateCodeFromSpec, from)),
		tap(unpatchConsoleLog),
		tap(() => notifyFSQuery.next(undefined)),
	)

	const codeViewerValue = pipe(
		fsActions.asObservable(),
		filter(
			(v: FileTreeActionPayload): v is FileClickPayload | PurgeBtnClickPayload =>
				v.type === 'FILENAME_SELECT' || v.type === 'FS_PURGE',
		),
		map((v) => {
			switch (v.type) {
				case 'FILENAME_SELECT':
					return pipe(
						v.value,
						(v) => readFile(v, 'utf-8'),
						from,
						map((code) => ({ code, filePath: v.value })),
					)
				case 'FS_PURGE':
					return of(undefined)
			}
		}),
		switchMap(identity),
	)

	const fsPaths = pipe(
		notifyFSQuery.asObservable(),
		switchMap(() => queryFS(ROOT_DIR)),
		share(),
	)

	const eexportFSToCodeSandboxEffect = pipe(
		fsActions.asObservable(),
		filter((v) => v.type === 'EXPORT_TO_CODESANDBOX'),
		withLatestFrom(fsPaths),
		switchMap(([, files]) => from(readDumpedFilesToRecord(files, stripPathExtraPrefix))),
		map(addPackageJSONStuff),
		switchMap((v) => ajax(getCodeSandboxAjaxConfig(v))),
		map((v) => codeSandboxResponseCodec.decode(v.response)),
		tap(
			// Note: use Geist toast to signal about error
			either.fold(constVoid, (v) => {
				window.open(getCodeSandboxURLToOpen(v.sandbox_id), '_blank')
			}),
		),
	)

	const purgeFSEffect = pipe(
		fsActions.asObservable(),
		filter((v) => v.type === 'FS_PURGE'),
		switchMap(() => from(rmDirContent(ROOT_DIR))),
		tap(() => notifyFSQuery.next(undefined)),
	)

	const effects = merge(specAddEffect, purgeFSEffect, eexportFSToCodeSandboxEffect)

	effects.subscribe()

	const props: IndexPageProps = {
		handleAddedSpec: (v) => spec.next(v),
		eventLog: eventMessage.asObservable(),
		filePaths: fsPaths,
		handleAction: (v) => fsActions.next(v),
		codeViewerValue,
	}

	return renderUI(props)
}
