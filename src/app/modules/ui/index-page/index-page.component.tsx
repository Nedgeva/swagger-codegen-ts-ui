import { Grid, Page } from '@geist-ui/core'
import { SpecAdd, SpecAddProps } from './components/spec-add/spec-add.component'
import { LogPrinter, LogPrinterProps } from './components/log-printer/log-printer.component'
import { FileTree, FileTreeProps } from './components/file-tree/file-tree.component'
import { CodeViewer, CodeViewerProps } from './components/code-viewer/code-viewer.component'
import { NotificationToast, NotificationToastProps } from './components/notification-toast/notification-toast.component'
import React, { memo } from 'react'

export interface IndexPageProps
	extends SpecAddProps,
		LogPrinterProps,
		FileTreeProps,
		CodeViewerProps,
		NotificationToastProps {}

export const IndexPage = memo((props: IndexPageProps) => {
	return (
		<Page dotBackdrop>
			<Page.Content>
				<Grid.Container gap={2} justify="center">
					<Grid xs={12} justify="center">
						<SpecAdd handleAddedSpec={props.handleAddedSpec} />
					</Grid>
					<Grid xs={12}>
						<LogPrinter eventLog={props.eventLog} />
					</Grid>
					<Grid xs={12}>
						<FileTree filePaths={props.filePaths} handleAction={props.handleAction} />
					</Grid>
					<Grid xs={12}>
						<CodeViewer codeViewerValue={props.codeViewerValue} />
					</Grid>
				</Grid.Container>
			</Page.Content>
			<NotificationToast notificationToastValue={props.notificationToastValue} />
		</Page>
	)
})
