import { Modal, Text } from '@geist-ui/core'
import * as React from 'react'
import { memo } from 'react'

interface FileTreeModalProps {
	readonly isOpen: boolean
	readonly handleClose: () => void
	readonly handleConfirm: () => void
}

export const FileTreeModal = memo((props: FileTreeModalProps) => {
	const { isOpen, handleClose, handleConfirm } = props

	return (
		<Modal visible={isOpen} onClose={handleClose}>
			<Modal.Title>Are you sure?</Modal.Title>
			<Modal.Content>
				<Text>This will purge all files on virtual fs.</Text>
			</Modal.Content>
			<Modal.Action passive onClick={handleClose}>
				Cancel
			</Modal.Action>
			<Modal.Action onClick={handleConfirm}>Ok, proceed</Modal.Action>
		</Modal>
	)
})
