export const downloadFile = (file: Blob, name: string): void => {
	const href = window.URL.createObjectURL(file)
	const a = document.createElement('a')
	a.setAttribute('style', 'display: none')
	a.setAttribute('href', href)
	a.setAttribute('download', name)
	document.body.appendChild(a)
	a.click()
	window.URL.revokeObjectURL(href)
	a.remove()
}
