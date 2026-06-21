import { AuthProvider } from './features/auth/context/AuthProvider'
import { BrowserRouter } from 'react-router-dom'
import Routers from './routers/Routers'

const App = () => {
  	return (
    	<BrowserRouter>
      		<AuthProvider>
        		<Routers />
      		</AuthProvider>
    	</BrowserRouter>
  	)
}

export default App