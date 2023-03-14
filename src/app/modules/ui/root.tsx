import React from 'react'
import { GeistProvider, CssBaseline } from '@geist-ui/core'
import { IndexPage, IndexPageProps } from './index-page/index-page.component'

export default (props: IndexPageProps) => (
	<GeistProvider>
		<CssBaseline />
		<IndexPage {...props} />
	</GeistProvider>
)
