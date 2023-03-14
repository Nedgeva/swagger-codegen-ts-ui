import { TreeFile } from '@geist-ui/core/esm/tree'
import { string } from 'fp-ts'
import { not } from 'fp-ts/lib/Predicate'

// adopted version of https://github.com/pthm/node-path-list-to-tree/blob/master/src/index.ts

const createNode = (filePaths: string[], tree: TreeFile[]): void => {
	const name = filePaths.shift()
	const idx = tree.findIndex((e: TreeFile) => {
		return e.name == name
	})

	if (name === undefined) return

	if (idx < 0) {
		if (filePaths.length !== 0) {
			const files: TreeFile[] = []

			tree.push({
				name: name,
				type: 'directory',
				files,
			})

			createNode(filePaths, files)
		} else {
			tree.push({
				name: name,
				type: 'file',
			})
		}
	} else {
		const files = tree[idx].files

		if (files) createNode(filePaths, files)
	}
}

export const getTreeFileFromFileList = (filePaths: string[]): TreeFile[] => {
	const tree: TreeFile[] = []
	for (let i = 0; i < filePaths.length; i++) {
		const path: string = filePaths[i]
		const split: string[] = path.split('/').filter(not(string.isEmpty))
		createNode(split, tree)
	}
	return tree
}
