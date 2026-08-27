import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './state/AuthContext'
import { DataProvider } from './state/DataContext'
import { SyncStatusBar } from './components/SyncStatusBar'
import { UndoToastHost } from './components/UndoToastHost'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <DataProvider>
          <SyncStatusBar />
          <App />
          <UndoToastHost />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
