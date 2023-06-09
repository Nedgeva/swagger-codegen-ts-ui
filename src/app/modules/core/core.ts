import { BrowserFS } from '../../../shim/bfs'
import { readonlyArray, either, json } from 'fp-ts'
import * as fs from 'fs'
import * as jsyaml from 'js-yaml'
import * as path from 'path'
import { SwaggerObject } from '@devexperts/swagger-codegen-ts/dist/schema/2.0/swagger-object'
import { OpenapiObjectCodec } from '@devexperts/swagger-codegen-ts/dist/schema/3.0/openapi-object'
import { AsyncAPIObjectCodec } from '@devexperts/swagger-codegen-ts/dist/schema/asyncapi-2.0.0/asyncapi-object'
import { Observable } from 'rxjs'
import * as util from 'util'
import { Either } from 'fp-ts/lib/Either'
import { constant, pipe } from 'fp-ts/lib/function'

export interface FileContentsRecord {
	readonly content: string
}

export const installAndConfigureBFS = (root: string) => {
	BrowserFS.install(window)
	BrowserFS.configure(
		{
			fs: 'MountableFileSystem',
			options: {
				[root]: { fs: 'InMemory' },
			},
		},
		function (e) {
			if (e) {
				throw e
			}
		},
	)
}

export const getConsoleLogPatcher = (onLogRequest: (message: string) => void) => {
	let logOriginal: undefined | typeof console.log = undefined

	const patch = () => {
		if (logOriginal) return

		logOriginal = console.log

		console.log = (...args: unknown[]) => {
			onLogRequest(args.join(' '))
		}
	}

	const unpatch = () => {
		logOriginal && (console.log = logOriginal)
		logOriginal = undefined
	}

	return { patch, unpatch }
}

export const readDir = util.promisify(fs.readdir)
export const readFile = util.promisify(fs.readFile)
export const unlink = util.promisify(fs.unlink)
export const stat = util.promisify(fs.stat)
export const writeFile = util.promisify(fs.writeFile)

const walk = function (dir: string, done: (err: NodeJS.ErrnoException | null, results?: string[]) => void) {
	let results: string[] = []
	fs.readdir(dir, function (err, list) {
		if (err) return done(err)
		let pending = list.length
		if (!pending) return done(null, results)
		list.forEach(function (file) {
			file = path.resolve(dir, file)
			fs.stat(file, function (_, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function (_, res) {
						results = results.concat(res ?? readonlyArray.empty)
						if (!--pending) done(null, results)
					})
				} else {
					results.push(file)
					if (!--pending) done(null, results)
				}
			})
		})
	})
}

export const queryFS = (path: string) =>
	new Observable<string[]>((subscriber) =>
		walk(path, function (err, results) {
			if (err) return subscriber.error(err)
			subscriber.next(results)
			subscriber.complete()
		}),
	)

export const rmDirContent = async (dir: string) => {
	const entries = await readDir(dir)
	await Promise.all(
		entries.map((entry) => {
			const fullPath = path.join(dir, entry)
			return stat(fullPath).then((e) => (e.isDirectory() ? rmDirContent(fullPath) : unlink(fullPath)))
		}),
	)
}

export const readDumpedFilesToRecord = async (filePaths: string[], pathProcess: (filePath: string) => string) => {
	const data = await Promise.all(
		filePaths.map((f) =>
			readFile(f, 'utf-8').then((contents) => ({
				path: pathProcess(f),
				contents,
			})),
		),
	)

	return data.reduce<Record<string, FileContentsRecord>>((acc, v) => {
		acc[v.path] = { content: v.contents }
		return acc
	}, {})
}

export type SpecType = 'SWAGGER' | 'OAPI' | 'ASYNC'

interface SpecFile {
	readonly name: string
	readonly contents: string
}

export const guessSpecTypeFromFileContents = (specFile: SpecFile): Either<Error, SpecType> => {
	const content = ['.yml', '.yaml'].some((ext) => specFile.name.endsWith(ext))
		? either.tryCatch(
				() => jsyaml.load(specFile.contents),
				() => new Error('Error while trying to convert yaml file to JSON'),
		  )
		: pipe(
				specFile.contents,
				json.parse,
				either.mapLeft(() => new Error('Error while parsing input file')),
		  )

	const decodeAsyncSpec = (content: unknown) =>
		pipe(content, AsyncAPIObjectCodec.asDecoder().decode, either.map(constant<SpecType>('ASYNC')))

	const decodeOAPISpec = (content: unknown) =>
		pipe(
			content,
			OpenapiObjectCodec.asDecoder().decode,
			either.map(constant<SpecType>('OAPI')),
			either.orElse(() => decodeAsyncSpec(content)),
		)

	return pipe(
		content,
		either.chain((content) =>
			pipe(
				content,
				SwaggerObject.asDecoder().decode,
				either.map(constant<SpecType>('SWAGGER')),
				either.orElse(() => decodeOAPISpec(content)),
				either.mapLeft(() => new Error("Can't decode input file: no appropriate spec decoders found")),
			),
		),
	)
}
