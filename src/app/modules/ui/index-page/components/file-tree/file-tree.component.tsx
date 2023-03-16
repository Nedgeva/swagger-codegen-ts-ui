import { Fieldset, Tree, Text, Button, ButtonGroup, Spacer, Tooltip } from '@geist-ui/core'
import { useObservableState } from 'observable-hooks'
import * as React from 'react'
import { memo } from 'react'
import { Observable } from 'rxjs'
import { GenericActionPayload } from '../../../../../types/types'
import { getTreeFileFromFileList } from './file-tree.model'
import { FileTreeModal } from './components/file-tree-modal/file-tree-modal.component'
import { Archive, Codesandbox } from '@geist-ui/icons'
import { isNonEmpty } from 'fp-ts/lib/ReadonlyArray'

export type FileClickPayload = GenericActionPayload<'FILENAME_SELECT', string>
export type PurgeBtnClickPayload = GenericActionPayload<'FS_PURGE'>
export type ExportToCodeSandboxBtnClickPayload = GenericActionPayload<'EXPORT_TO_CODESANDBOX'>
export type ExportToZipBtnClickPayload = GenericActionPayload<'EXPORT_TO_ZIP'>

export type FileTreeActionPayload =
	| FileClickPayload
	| PurgeBtnClickPayload
	| ExportToCodeSandboxBtnClickPayload
	| ExportToZipBtnClickPayload

export interface FileTreeProps {
	readonly filePaths: Observable<string[]>
	readonly handleAction: (payload: FileTreeActionPayload) => void
}

export const FileTree = memo((props: FileTreeProps) => {
	const { filePaths, handleAction } = props

	const [isPurgeModalOpen, setPurgeModalOpenState] = React.useState(false)

	const fileTree = useObservableState(filePaths)

	const filesTree = React.useMemo(() => getTreeFileFromFileList(fileTree ?? []), [fileTree])

	const footer = React.useMemo(
		() => (
			<div className="file-tree-footer-bar">
				<Button auto scale={1 / 3} type="error" font="12px" onClick={() => setPurgeModalOpenState(true)}>
					Purge
				</Button>
				<Spacer w={1} />
				<Text font="12px">Export to ...</Text>
				<Spacer w={1 / 3} />
				<ButtonGroup scale={1 / 3}>
					<Tooltip text="Codesandbox" type="dark">
						<Button
							scale={1 / 3}
							font="12px"
							iconRight={<Codesandbox />}
							onClick={() => handleAction({ type: 'EXPORT_TO_CODESANDBOX' })}
						/>
					</Tooltip>
					<Tooltip text="Zip archive" type="dark">
						<Button
							scale={1 / 3}
							font="12px"
							iconRight={<Archive />}
							onClick={() => handleAction({ type: 'EXPORT_TO_ZIP' })}
						/>
					</Tooltip>
				</ButtonGroup>
			</div>
		),
		[handleAction],
	)

	return (
		<Fieldset width="100%">
			<Fieldset.Subtitle>
				<Tree
					className="file-tree"
					onClick={(value) => handleAction({ type: 'FILENAME_SELECT', value })}
					value={filesTree}
				/>
			</Fieldset.Subtitle>
			<Fieldset.Footer>
				<Text>Filesystem tree</Text>
				{isNonEmpty(filesTree) && footer}
			</Fieldset.Footer>
			<FileTreeModal
				isOpen={isPurgeModalOpen}
				handleClose={() => setPurgeModalOpenState(false)}
				handleConfirm={() => {
					handleAction({ type: 'FS_PURGE' })
					setPurgeModalOpenState(false)
				}}
			/>
		</Fieldset>
	)
})
