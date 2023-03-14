import { createRoot } from 'react-dom/client'
import { IndexPageProps } from './index-page/index-page.component'
import RootApp from './root'

const container = document.getElementById('main')
export const renderUI = (props: IndexPageProps) => createRoot(container ?? document.body).render(RootApp(props))
