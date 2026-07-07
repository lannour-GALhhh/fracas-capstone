import { AuthProvider } from './features/auth/context/AuthProvider'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import Routers from './routers/Routers'
import { queryClient } from './app/queryClient'
import { Toaster } from './common/ui/sonner'
import { TooltipProvider } from './common/ui/tooltip'

const App = () => {
  	return (
    	<QueryClientProvider client={queryClient}>
    		<TooltipProvider>
    			<BrowserRouter>
      				<AuthProvider>
        				<Routers />
      				</AuthProvider>
    			</BrowserRouter>
    		</TooltipProvider>
    		<Toaster position='bottom-right' richColors closeButton />
    	</QueryClientProvider>
  	)
}

export default App