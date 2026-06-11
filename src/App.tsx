import { BrowserRouter } from 'react-router-dom'
import { SWRConfig } from 'swr'

import { GlobalErrorBoundary } from './components/GlobalErrorBoundary'
import { I18NProvider } from './i18n/I18NProvider'
import { FCC } from './types'

export const App: FCC = ({ children }) => {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 1000 * 60,
        focusThrottleInterval: 1000 * 5,
        errorRetryInterval: 1000 * 3,
        errorRetryCount: 3,
      }}
    >
      <GlobalErrorBoundary>
        <I18NProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </I18NProvider>
      </GlobalErrorBoundary>
    </SWRConfig>
  )
}
