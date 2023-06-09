import * as path from 'path'
import { generate } from '@devexperts/swagger-codegen-ts/dist'
import { filter, from, identity, map, merge, of, share, Subject, switchMap, tap, withLatestFrom } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { serialize as serializeSwagger2 } from '@devexperts/swagger-codegen-ts/dist/language/typescript/2.0'
import { SwaggerObject } from '@devexperts/swagger-codegen-ts/dist/schema/2.0/swagger-object'
import { serialize as serializeOpenAPI } from '@devexperts/swagger-codegen-ts/dist/language/typescript/3.0'
import { OpenapiObjectCodec } from '@devexperts/swagger-codegen-ts/dist/schema/3.0/openapi-object'
import { serialize as serializeAsyncAPI } from '@devexperts/swagger-codegen-ts/dist/language/typescript/asyncapi-2.0.0'
import { AsyncAPIObjectCodec } from '@devexperts/swagger-codegen-ts/dist/schema/asyncapi-2.0.0/asyncapi-object'
import { renderUI } from './modules/ui/app.ui'
import { IndexPageProps } from './modules/ui/index-page/index-page.component'
import { constVoid, pipe } from 'fp-ts/lib/function'
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
	guessSpecTypeFromFileContents,
	installAndConfigureBFS,
	queryFS,
	readDumpedFilesToRecord,
	readFile,
	rmDirContent,
	SpecType,
	writeFile,
} from './modules/core/core'
import {
	addPackageJSON,
	addPackageJSONStuffToCodeSandbox,
	codeSandboxResponseCodec,
	getCodeSandboxAjaxConfig,
	getCodeSandboxURLToOpen,
	zipFiles,
} from './modules/core/integrations'
import { downloadFile } from './modules/ui/utils/download.util'

const ROOT_DIR = '/tmp'

installAndConfigureBFS(ROOT_DIR)

const stripPathExtraPrefix = (filePath: string) =>
	filePath.replace(new RegExp(`^${ROOT_DIR}/`), string.empty).replace(new RegExp('^(/?)generated/'), string.empty)

const generateCodeFromSpec = (specFileName: string, specType: SpecType) => {
	const commonOptions = { cwd: '/tmp', out: '/tmp/generated', spec: `./${specFileName}` }

	const runGenerator = (() => {
		switch (specType) {
			case 'SWAGGER':
				return generate({
					...commonOptions,
					language: serializeSwagger2,
					decoder: SwaggerObject,
				})
			case 'OAPI':
				return generate({
					...commonOptions,
					language: serializeOpenAPI,
					decoder: OpenapiObjectCodec,
				})
			case 'ASYNC':
				return generate({
					...commonOptions,
					language: serializeAsyncAPI,
					decoder: AsyncAPIObjectCodec,
				})
		}
	})()

	return runGenerator()
}

export const app = async () => {
	const spec = new Subject<SpecFile[]>()
	const eventMessage = new Subject<string>()
	const fsActions = new Subject<FileTreeActionPayload>()
	const notifyFSQuery = new Subject()

	const { patch: patchConsoleLog, unpatch: unpatchConsoleLog } = getConsoleLogPatcher((v) => eventMessage.next(v))

	const specAdd = pipe(
		spec.asObservable(),
		tap(patchConsoleLog),
		switchMap((xs) => from(xs)),
		mergeMap((specFile) =>
			pipe(
				writeFile(path.join(ROOT_DIR, specFile.name), specFile.contents),
				from,
				map(() =>
					pipe(
						specFile,
						guessSpecTypeFromFileContents,
						either.map((specType) => ({ specType, specFile })),
					),
				),
			),
		),
		share(),
	)

	const specAddSuccessEffect = pipe(
		specAdd,
		filter(either.isRight),
		switchMap((spec) => from(generateCodeFromSpec(spec.right.specFile.name, spec.right.specType))),
		tap(unpatchConsoleLog),
		tap(() => notifyFSQuery.next(undefined)),
	)

	const specAddFailEffect = pipe(specAdd, filter(either.isLeft), tap(unpatchConsoleLog))

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

	const specAddFailEvent = pipe(
		specAdd,
		filter(either.isLeft),
		map((e) => ({ message: e.left.message, type: 'error' as const })),
	)

	const notificationToastValue = merge(specAddFailEvent)

	/* #region effects */
	const exportFSToCodeSandboxEffect = pipe(
		fsActions.asObservable(),
		filter((v) => v.type === 'EXPORT_TO_CODESANDBOX'),
		withLatestFrom(fsPaths),
		switchMap(([, files]) => from(readDumpedFilesToRecord(files, stripPathExtraPrefix))),
		map(addPackageJSONStuffToCodeSandbox),
		switchMap((v) => ajax(getCodeSandboxAjaxConfig(v))),
		map((v) => codeSandboxResponseCodec.decode(v.response)),
		tap(
			// Note: use Geist toast to signal about error
			either.fold(constVoid, (v) => {
				window.open(getCodeSandboxURLToOpen(v.sandbox_id), '_blank')
			}),
		),
	)

	const exportFSToZipEffect = pipe(
		fsActions.asObservable(),
		filter((v) => v.type === 'EXPORT_TO_ZIP'),
		withLatestFrom(fsPaths),
		switchMap(([, files]) => from(readDumpedFilesToRecord(files, stripPathExtraPrefix))),
		map((v) => {
			const date = new Date()
			return { files: addPackageJSON(v, date), date }
		}),
		switchMap(({ files, date }) => from(zipFiles(files).then((zipBlob) => ({ zipBlob, date })))),
		tap(({ zipBlob, date }) =>
			downloadFile(zipBlob, `${date.toISOString().replace(':', '_')}-swagger-codegen-ts-ui.zip`),
		),
	)

	const purgeFSEffect = pipe(
		fsActions.asObservable(),
		filter((v) => v.type === 'FS_PURGE'),
		switchMap(() => from(rmDirContent(ROOT_DIR))),
		tap(() => notifyFSQuery.next(undefined)),
	)
	/* #endregion */

	const effects = merge(
		specAddSuccessEffect,
		specAddFailEffect,
		purgeFSEffect,
		exportFSToCodeSandboxEffect,
		exportFSToZipEffect,
	)

	effects.subscribe()

	const props: IndexPageProps = {
		handleAddedSpec: (v) => spec.next(v),
		eventLog: eventMessage.asObservable(),
		filePaths: fsPaths,
		handleAction: (v) => fsActions.next(v),
		codeViewerValue,
		notificationToastValue,
	}

	return renderUI(props)
}
