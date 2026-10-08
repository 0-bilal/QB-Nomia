import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './state/AuthContext'
import { DataProvider } from './state/DataContext'
import { IslandHost } from './components/IslandHost'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <DataProvider>
          <App />
          <IslandHost />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
