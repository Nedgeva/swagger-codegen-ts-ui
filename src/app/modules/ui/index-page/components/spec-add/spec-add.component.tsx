import { useDropzone } from 'react-dropzone'
import { Display, Fieldset } from '@geist-ui/core'
import { FileText } from '@geist-ui/icons'
import * as React from 'react'
import { memo } from 'react'

export interface SpecFile {
	readonly name: string
	readonly contents: string
}

export interface SpecAddProps {
	readonly handleAddedSpec: (specFiles: SpecFile[]) => void
}

const renderFileStatusBar = (files: File[]): string => {
	if (!files.length) return 'Status: waiting for spec...'

	const statusString = 'Status:'

	switch (files.length) {
		case 0:
			return `${statusString} waiting for spec...`
		case 1:
			return `Status: file ${files[0].name} uploaded`
		case 2:
			return `Status: files ${files.map((f) => f.name).join(', ')} uploaded`
		default:
			return `Status: files ${files
				.slice(0, 2)
				.map((f) => f.name)
				.join(', ')} and ${files.length - 2} more uploaded`
	}
}

export const SpecAdd = memo((props: SpecAddProps) => {
	const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
		onDrop: (files) =>
			files.length &&
			Promise.all(
				files.map((f) =>
					f.text().then((contents) => ({
						name: f.name,
						contents,
					})),
				),
			).then(props.handleAddedSpec),
	})

	return (
		<Fieldset width="100%">
			<Fieldset.Subtitle>
				<div {...getRootProps({ className: 'dropzone' })}>
					<Display caption="Drag 'n' drop some files here, or click to select files">
						<input {...getInputProps()} />
						<FileText size={200} />
					</Display>
				</div>
			</Fieldset.Subtitle>
			<Fieldset.Footer>{renderFileStatusBar(acceptedFiles)}</Fieldset.Footer>
		</Fieldset>
	)
})
